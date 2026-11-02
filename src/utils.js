const crypto = require('crypto');
const { HttpError } = require('./httpError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const CATEGORIES = ['Tatuagem', 'Eletricista', 'Bartender', 'Esteticista', 'Geral'];

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

function assertEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Informe um e-mail válido.');
  if (email.length > 100) throw new HttpError(400, 'O e-mail deve ter no máximo 100 caracteres.');
  return email;
}

function assertPassword(value) {
  const password = String(value || '');
  if (password.length < 6) throw new HttpError(400, 'A senha deve ter no mínimo 6 caracteres.');
  if (password.length > 72) throw new HttpError(400, 'A senha deve ter no máximo 72 caracteres.');
  return password;
}

function assertPhone(value) {
  const phone = String(value || '').trim();
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) throw new HttpError(400, 'Informe um telefone válido.');
  if (phone.length > 20) throw new HttpError(400, 'O telefone deve ter no máximo 20 caracteres.');
  return phone;
}

function assertDate(value, message = 'Informe uma data válida.') {
  const text = String(value || '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) throw new HttpError(400, message);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new HttpError(400, message);
  }
  return text;
}

function optionalDate(value) {
  if (value == null || String(value).trim() === '') return null;
  return assertDate(value);
}

function normalizeTime(value) {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(value || '').trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || 0);
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return `${match[1]}:${match[2]}:${String(seconds).padStart(2, '0')}`;
}

function assertTime(value, message) {
  const time = normalizeTime(value);
  if (!time) throw new HttpError(400, message);
  return time;
}

function timeToMinutes(value) {
  const time = normalizeTime(value);
  if (!time) return null;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function asTime(value) {
  if (value == null) return null;
  const match = /^(\d{2}):(\d{2})/.exec(String(value));
  return match ? `${match[1]}:${match[2]}` : String(value).slice(0, 5);
}

function asDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

function parsePrice(value) {
  if (typeof value === 'number') return value;
  const raw = String(value ?? '').trim();
  if (!raw) return NaN;
  if (raw.includes(',')) return Number.parseFloat(raw.replace(/\./g, '').replace(',', '.'));
  return Number.parseFloat(raw);
}

function assertPrice(value, message = 'Informe um valor maior que zero.') {
  const price = parsePrice(value);
  if (!Number.isFinite(price) || price <= 0) throw new HttpError(400, message);
  if (price > 99999999.99) throw new HttpError(400, 'O valor informado é alto demais.');
  return Math.round(price * 100) / 100;
}

function assertCategory(value) {
  const category = String(value || 'Geral').trim() || 'Geral';
  if (!CATEGORIES.includes(category)) throw new HttpError(400, 'Categoria inválida.');
  return category;
}

function likeContains(value) {
  return `%${String(value).replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

function hashCode(code, secret) {
  return crypto.createHash('sha256').update(`${secret}:${code}`).digest('hex');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function mapUser(row) {
  return {
    id: row.id,
    name: row.nome,
    role: row.servico || 'Profissional autônomo',
    email: row.email,
  };
}

function mapClient(row, extras) {
  return {
    id: row.id,
    name: row.nome,
    phone: row.telefone,
    email: row.email || '',
    notes: row.observacoes || '',
    ...extras,
  };
}

function mapService(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.nome,
    duration: Number(row.duracao_minutos),
    price: Number(row.preco),
    category: row.categoria,
  };
}

function mapAppointment(row, client, service) {
  return {
    id: row.id,
    date: asDate(row.data),
    start: asTime(row.inicio),
    end: asTime(row.fim),
    clientId: row.cliente_id,
    clientName: client?.nome || row.cliente_nome || '',
    serviceId: row.servico_id,
    price: Number(row.preco),
    status: row.status,
    notes: row.observacoes || '',
    client: client ? mapClient(client) : null,
    service: mapService(service),
  };
}

module.exports = {
  CATEGORIES,
  parseId,
  assertEmail,
  assertPassword,
  assertPhone,
  assertDate,
  optionalDate,
  assertTime,
  timeToMinutes,
  asTime,
  asDate,
  assertPrice,
  assertCategory,
  likeContains,
  hashCode,
  safeEqual,
  mapUser,
  mapClient,
  mapService,
  mapAppointment,
};
