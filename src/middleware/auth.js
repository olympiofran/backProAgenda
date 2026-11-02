const jwt = require('jsonwebtoken');
const config = require('../config');
const { HttpError } = require('../httpError');

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return next(new HttpError(401, 'Faça login para continuar.'));

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      return next(new HttpError(401, 'Sessão expirada. Faça login novamente.'));
    }
    req.userId = userId;
    return next();
  } catch (err) {
    return next(new HttpError(401, 'Sessão expirada. Faça login novamente.'));
  }
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

module.exports = { authRequired, signToken };
