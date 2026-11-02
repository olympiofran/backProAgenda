const { HttpError } = require('../httpError');

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }

  if (err && (err.type === 'entity.parse.failed' || err instanceof SyntaxError)) {
    return res.status(400).json({ message: 'JSON inválido.' });
  }

  if (err && err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
  }

  console.error(err);
  return res.status(500).json({ message: 'Erro interno do servidor.' });
}

module.exports = { errorHandler };
