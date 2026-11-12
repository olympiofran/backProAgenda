const express = require('express');
const db = require('../db');
const { HttpError } = require('../httpError');
const { asyncHandler } = require('../middleware/asyncHandler');
const { parseId, assertPrice, assertCategory, mapService } = require('../utils');

const router = express.Router();

function readService(body) {
  const name = String((body || {}).name || '').trim();
  if (!name) throw new HttpError(400, 'Informe o nome do serviço.');
  if (name.length > 100) throw new HttpError(400, 'O nome deve ter no máximo 100 caracteres.');

  const duration = Number((body || {}).duration);
  if (!Number.isInteger(duration) || duration < 15) {
    throw new HttpError(400, 'A duração mínima é de 15 minutos.');
  }
  if (duration > 720) throw new HttpError(400, 'A duração máxima é de 720 minutos.');

  return {
    nome: name,
    duracao_minutos: duration,
    preco: assertPrice((body || {}).price, 'Informe um preço maior que zero.'),
    categoria: assertCategory((body || {}).category),
  };
}

router.get('/', asyncHandler(async (req, res) => {
  const services = await db('servicos').where({ cadastro_id: req.userId }).orderBy('nome');
  res.json(services.map(mapService));
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = readService(req.body);
  const inserted = await db('servicos').insert({ ...data, cadastro_id: req.userId }).returning('id');
  const created = inserted[0];
  const id = created && typeof created === 'object' ? created.id : created;
  const service = await db('servicos').where({ id }).first();
  res.status(201).json(mapService(service));
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) throw new HttpError(404, 'Serviço não encontrado.');
  const current = await db('servicos').where({ id, cadastro_id: req.userId }).first();
  if (!current) throw new HttpError(404, 'Serviço não encontrado.');
  const data = readService(req.body);
  await db('servicos').where({ id }).update(data);
  const service = await db('servicos').where({ id }).first();
  res.json(mapService(service));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) throw new HttpError(404, 'Serviço não encontrado.');

  const service = await db('servicos').where({ id, cadastro_id: req.userId }).first();
  if (!service) throw new HttpError(404, 'Serviço não encontrado.');

  const row = await db('agendamentos').where({ servico_id: id }).count({ total: 'id' }).first();
  const used = Number(row.total || 0);
  if (used) {
    throw new HttpError(409, `Este serviço está vinculado a ${used} agendamento(s) e não pode ser excluído.`);
  }

  await db('servicos').where({ id }).delete();
  res.json({ deleted: true });
}));

module.exports = router;
