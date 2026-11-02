const express = require('express');
const db = require('../db');
const { HttpError } = require('../httpError');
const { asyncHandler } = require('../middleware/asyncHandler');
const {
  parseId,
  optionalDate,
  assertTime,
  timeToMinutes,
  asTime,
  asDate,
  assertPrice,
  mapAppointment,
} = require('../utils');

const router = express.Router();

async function lockProfessional(trx, cadastroId) {
  await trx('cadastro').where({ id: cadastroId }).forUpdate().first();
}

async function findConflict(trx, { cadastroId, date, start, end, ignoreId }) {
  const rows = await trx('agendamentos')
    .where({ cadastro_id: cadastroId, data: date })
    .whereNot('status', 'cancelado')
    .modify((query) => {
      if (ignoreId) query.whereNot('id', ignoreId);
    })
    .forUpdate();

  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  return rows.find((row) => startMin < timeToMinutes(row.fim) && endMin > timeToMinutes(row.inicio)) || null;
}

function conflictError(row) {
  return new HttpError(
    409,
    `Conflito de horário: já existe um agendamento das ${asTime(row.inicio)} às ${asTime(row.fim)} nesta data.`,
  );
}

async function loadClient(trx, userId, clientId) {
  const id = parseId(clientId);
  if (!id) return null;
  const client = await trx('clientes').where({ id, cadastro_id: userId }).first();
  if (!client) throw new HttpError(404, 'Cliente não encontrado.');
  return client;
}

function readSchedule(body) {
  const date = optionalDate(body.date);
  if (!date) throw new HttpError(400, 'Escolha a data do agendamento.');
  const start = assertTime(body.start, 'Informe o horário de início.');
  const end = assertTime(body.end, 'Informe o horário de término.');
  if (timeToMinutes(end) <= timeToMinutes(start)) {
    throw new HttpError(400, 'O término deve ser depois do início.');
  }
  const notes = String(body.notes || '').trim();
  if (notes.length > 2000) throw new HttpError(400, 'As observações devem ter no máximo 2000 caracteres.');
  return {
    date,
    start,
    end,
    price: assertPrice(body.price, 'Informe o valor a cobrar.'),
    notes,
  };
}

router.get('/', asyncHandler(async (req, res) => {
  const inicio = optionalDate(req.query.inicio);
  const fim = optionalDate(req.query.fim);
  if (inicio && fim && inicio > fim) throw new HttpError(400, 'O intervalo de datas é inválido.');

  const rows = await db('agendamentos as a')
    .leftJoin('clientes as c', 'c.id', 'a.cliente_id')
    .leftJoin('servicos as s', 's.id', 'a.servico_id')
    .where('a.cadastro_id', req.userId)
    .modify((query) => {
      if (inicio) query.where('a.data', '>=', inicio);
      if (fim) query.where('a.data', '<=', fim);
    })
    .orderBy([
      { column: 'a.data', order: 'asc' },
      { column: 'a.inicio', order: 'asc' },
    ])
    .select(
      'a.*',
      'c.id as c_id',
      'c.nome as c_nome',
      'c.telefone as c_telefone',
      'c.email as c_email',
      'c.observacoes as c_observacoes',
      's.id as s_id',
      's.nome as s_nome',
      's.duracao_minutos as s_duracao',
      's.preco as s_preco',
      's.categoria as s_categoria',
    );

  res.json(rows.map((row) => mapAppointment(
    row,
    row.c_id ? {
      id: row.c_id,
      nome: row.c_nome,
      telefone: row.c_telefone,
      email: row.c_email,
      observacoes: row.c_observacoes,
    } : null,
    row.s_id ? {
      id: row.s_id,
      nome: row.s_nome,
      duracao_minutos: row.s_duracao,
      preco: row.s_preco,
      categoria: row.s_categoria,
    } : null,
  )));
}));

router.post('/', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const schedule = readSchedule(body);
  const serviceId = parseId(body.serviceId);
  if (!serviceId) throw new HttpError(404, 'Serviço não encontrado.');

  const created = await db.transaction(async (trx) => {
    await lockProfessional(trx, req.userId);
    const service = await trx('servicos').where({ id: serviceId, cadastro_id: req.userId }).first();
    if (!service) throw new HttpError(404, 'Serviço não encontrado.');

    const client = await loadClient(trx, req.userId, body.clientId);
    const clientName = (client?.nome || String(body.clientName || '').trim()).slice(0, 100);
    const conflict = await findConflict(trx, { cadastroId: req.userId, ...schedule });
    if (conflict) throw conflictError(conflict);

    const [id] = await trx('agendamentos').insert({
      cadastro_id: req.userId,
      cliente_id: client ? client.id : null,
      servico_id: service.id,
      cliente_nome: clientName,
      data: schedule.date,
      inicio: schedule.start,
      fim: schedule.end,
      preco: schedule.price,
      status: 'confirmado',
      observacoes: schedule.notes,
    });
    const row = await trx('agendamentos').where({ id }).first();
    return mapAppointment(row, client, service);
  });

  res.status(201).json(created);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) throw new HttpError(404, 'Agendamento não encontrado.');
  const body = req.body || {};
  const schedule = readSchedule(body);
  const serviceId = parseId(body.serviceId);
  if (!serviceId) throw new HttpError(404, 'Serviço não encontrado.');

  const status = body.status || null;
  if (status && !['confirmado', 'cancelado'].includes(status)) {
    throw new HttpError(400, 'Status inválido.');
  }

  const updated = await db.transaction(async (trx) => {
    await lockProfessional(trx, req.userId);
    const current = await trx('agendamentos').where({ id, cadastro_id: req.userId }).forUpdate().first();
    if (!current) throw new HttpError(404, 'Agendamento não encontrado.');

    const service = await trx('servicos').where({ id: serviceId, cadastro_id: req.userId }).first();
    if (!service) throw new HttpError(404, 'Serviço não encontrado.');

    const client = body.clientId ? await loadClient(trx, req.userId, body.clientId) : null;
    const nextStatus = status || current.status;
    if (nextStatus !== 'cancelado') {
      const conflict = await findConflict(trx, { cadastroId: req.userId, ...schedule, ignoreId: id });
      if (conflict) throw conflictError(conflict);
    }

    const clientName = (client?.nome || String(body.clientName || current.cliente_nome || '').trim()).slice(0, 100);
    await trx('agendamentos').where({ id }).update({
      cliente_id: client ? client.id : current.cliente_id,
      servico_id: service.id,
      cliente_nome: clientName,
      data: schedule.date,
      inicio: schedule.start,
      fim: schedule.end,
      preco: schedule.price,
      status: nextStatus,
      observacoes: schedule.notes,
    });
    const row = await trx('agendamentos').where({ id }).first();
    const linkedClient = row.cliente_id
      ? await trx('clientes').where({ id: row.cliente_id, cadastro_id: req.userId }).first()
      : null;
    return mapAppointment(row, linkedClient, service);
  });

  res.json(updated);
}));

router.patch('/:id/status', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) throw new HttpError(404, 'Agendamento não encontrado.');
  const status = (req.body || {}).status;
  if (!['confirmado', 'cancelado'].includes(status)) throw new HttpError(400, 'Status inválido.');

  const updated = await db.transaction(async (trx) => {
    await lockProfessional(trx, req.userId);
    const current = await trx('agendamentos').where({ id, cadastro_id: req.userId }).forUpdate().first();
    if (!current) throw new HttpError(404, 'Agendamento não encontrado.');

    if (status === 'confirmado') {
      const conflict = await findConflict(trx, {
        cadastroId: req.userId,
        date: asDate(current.data),
        start: current.inicio,
        end: current.fim,
        ignoreId: id,
      });
      if (conflict) throw conflictError(conflict);
    }

    await trx('agendamentos').where({ id }).update({ status });
    const row = await trx('agendamentos').where({ id }).first();
    const client = row.cliente_id
      ? await trx('clientes').where({ id: row.cliente_id }).first()
      : null;
    const service = await trx('servicos').where({ id: row.servico_id }).first();
    return mapAppointment(row, client, service);
  });

  res.json(updated);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) throw new HttpError(404, 'Agendamento não encontrado.');
  const deleted = await db('agendamentos').where({ id, cadastro_id: req.userId }).delete();
  if (!deleted) throw new HttpError(404, 'Agendamento não encontrado.');
  res.json({ deleted: true });
}));

module.exports = router;
