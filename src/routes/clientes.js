const express = require('express');
const db = require('../db');
const { HttpError } = require('../httpError');
const { asyncHandler } = require('../middleware/asyncHandler');
const {
  parseId,
  assertEmail,
  assertPhone,
  asDate,
  likeContains,
  mapClient,
} = require('../utils');

const router = express.Router();

function readClient(body) {
  const name = String((body || {}).name || '').trim();
  if (!name) throw new HttpError(400, 'Informe o nome do cliente.');
  if (name.length > 100) throw new HttpError(400, 'O nome deve ter no máximo 100 caracteres.');

  const emailRaw = String((body || {}).email || '').trim();
  const email = emailRaw ? assertEmail(emailRaw) : '';
  const notes = String((body || {}).notes || '').trim();
  if (notes.length > 2000) throw new HttpError(400, 'As observações devem ter no máximo 2000 caracteres.');

  return {
    nome: name,
    telefone: assertPhone((body || {}).phone),
    email,
    observacoes: notes,
  };
}

router.get('/', asyncHandler(async (req, res) => {
  const term = String(req.query.q || '').trim().toLowerCase();
  const clients = await db('clientes')
    .where({ cadastro_id: req.userId })
    .modify((query) => {
      if (!term) return;
      const like = likeContains(term);
      query.where((builder) => {
        builder.where('nome', 'like', like)
          .orWhere('telefone', 'like', like)
          .orWhere('email', 'like', like);
      });
    })
    .orderBy('nome');

  const stats = await db('agendamentos')
    .where({ cadastro_id: req.userId })
    .whereNotNull('cliente_id')
    .groupBy('cliente_id')
    .select('cliente_id')
    .count({ total: 'id' })
    .max({ last: 'data' });
  const byClient = new Map(stats.map((row) => [row.cliente_id, row]));

  res.json(clients.map((client) => {
    const info = byClient.get(client.id);
    return mapClient(client, {
      total: info ? Number(info.total) : 0,
      last: info ? asDate(info.last) : null,
    });
  }));
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = readClient(req.body);
  const inserted = await db('clientes').insert({ ...data, cadastro_id: req.userId }).returning('id');
  const created = inserted[0];
  const id = created && typeof created === 'object' ? created.id : created;
  const client = await db('clientes').where({ id }).first();
  res.status(201).json(mapClient(client));
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) throw new HttpError(404, 'Cliente não encontrado.');
  const current = await db('clientes').where({ id, cadastro_id: req.userId }).first();
  if (!current) throw new HttpError(404, 'Cliente não encontrado.');
  const data = readClient(req.body);
  await db('clientes').where({ id }).update(data);
  const client = await db('clientes').where({ id }).first();
  res.json(mapClient(client));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) throw new HttpError(404, 'Cliente não encontrado.');
  const deleted = await db('clientes').where({ id, cadastro_id: req.userId }).delete();
  if (!deleted) throw new HttpError(404, 'Cliente não encontrado.');
  res.json({ deleted: true });
}));

module.exports = router;
