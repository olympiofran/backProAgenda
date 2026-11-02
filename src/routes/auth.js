const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const config = require('../config');
const { HttpError } = require('../httpError');
const { asyncHandler } = require('../middleware/asyncHandler');
const { signToken } = require('../middleware/auth');
const {
  assertEmail,
  assertPassword,
  assertPhone,
  hashCode,
  safeEqual,
  mapUser,
} = require('../utils');

const router = express.Router();

router.post('/login', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const email = assertEmail(body.email);
  const password = String(body.password || '');
  const user = await db('cadastro').whereRaw('LOWER(email) = ?', [email]).first();
  if (!user) {
    throw new HttpError(401, 'E-mail não encontrado. Verifique os dados e tente novamente.');
  }
  const matches = user.senha ? await bcrypt.compare(password, user.senha) : false;
  if (!matches) {
    throw new HttpError(401, 'Senha incorreta. Verifique e tente novamente.');
  }
  res.json({ token: signToken(user.id), user: mapUser(user) });
}));

router.post('/auth/register', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  if (!name) throw new HttpError(400, 'Informe seu nome completo.');
  if (name.length > 30) throw new HttpError(400, 'O nome deve ter no máximo 30 caracteres.');

  const email = assertEmail(body.email);
  const phoneRaw = String(body.phone || '').trim();
  const phone = phoneRaw ? assertPhone(phoneRaw) : null;
  const password = assertPassword(body.password);
  const role = String(body.role || 'Profissional autônomo').trim() || 'Profissional autônomo';
  if (role.length > 30) throw new HttpError(400, 'A atividade deve ter no máximo 30 caracteres.');

  const existing = await db('cadastro').whereRaw('LOWER(email) = ?', [email]).first();
  if (existing) throw new HttpError(409, 'Este e-mail já está cadastrado.');

  const senha = await bcrypt.hash(password, 10);
  const [id] = await db('cadastro').insert({
    nome: name,
    telefone: phone,
    email,
    senha,
    servico: role,
  });
  const user = await db('cadastro').where({ id }).first();
  res.status(201).json({ token: signToken(user.id), user: mapUser(user) });
}));

router.post('/auth/reset-code', asyncHandler(async (req, res) => {
  const email = assertEmail((req.body || {}).email);
  const user = await db('cadastro').whereRaw('LOWER(email) = ?', [email]).first();
  const payload = { sent: true, expiresIn: 300 };

  if (!user) {
    res.json(payload);
    return;
  }

  const code = String(crypto.randomInt(1000, 10000));
  await db('codigos_recuperacao').where({ cadastro_id: user.id }).delete();
  await db('codigos_recuperacao').insert({
    cadastro_id: user.id,
    codigo_hash: hashCode(code, config.jwtSecret),
    verificado: false,
    expira_em: db.raw('DATE_ADD(NOW(), INTERVAL 5 MINUTE)'),
  });

  if (config.exposeResetCode) payload.demoCode = code;
  res.json(payload);
}));

router.post('/auth/verify-code', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const email = assertEmail(body.email);
  const code = String(body.code || '').trim();
  if (!/^\d{4}$/.test(code)) {
    throw new HttpError(400, 'Código inválido ou expirado. Solicite um novo código.');
  }

  const user = await db('cadastro').whereRaw('LOWER(email) = ?', [email]).first();
  if (!user) throw new HttpError(400, 'Código inválido ou expirado. Solicite um novo código.');

  const rows = await db('codigos_recuperacao')
    .where({ cadastro_id: user.id })
    .orderBy('id', 'desc')
    .select('*', db.raw('(expira_em > NOW()) as vigente'));

  const expected = hashCode(code, config.jwtSecret);
  const match = rows.find((row) => safeEqual(row.codigo_hash, expected));
  if (!match) throw new HttpError(400, 'Código inválido ou expirado. Solicite um novo código.');
  if (!Number(match.vigente)) throw new HttpError(400, 'Código expirado. Solicite um novo código.');

  await db('codigos_recuperacao').where({ id: match.id }).update({ verificado: true });
  res.json({ valid: true });
}));

router.post('/auth/reset-password', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const email = assertEmail(body.email);
  const password = assertPassword(body.password);
  if (password !== String(body.confirmation || '')) {
    throw new HttpError(400, 'As senhas não conferem.');
  }

  const user = await db('cadastro').whereRaw('LOWER(email) = ?', [email]).first();
  if (!user) throw new HttpError(400, 'Código inválido ou expirado. Solicite um novo código.');

  const verified = await db('codigos_recuperacao')
    .where({ cadastro_id: user.id, verificado: 1 })
    .whereRaw('expira_em > NOW()')
    .orderBy('id', 'desc')
    .first();
  if (!verified) throw new HttpError(400, 'Código inválido ou expirado. Solicite um novo código.');

  await db.transaction(async (trx) => {
    await trx('cadastro').where({ id: user.id }).update({ senha: await bcrypt.hash(password, 10) });
    await trx('codigos_recuperacao').where({ cadastro_id: user.id }).delete();
  });

  res.json({ updated: true });
}));

module.exports = router;
