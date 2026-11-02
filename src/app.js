const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const authRoutes = require('./routes/auth');
const agendamentosRoutes = require('./routes/agendamentos');
const clientesRoutes = require('./routes/clientes');
const servicosRoutes = require('./routes/servicos');
const { authRequired } = require('./middleware/auth');
const { asyncHandler } = require('./middleware/asyncHandler');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
});

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', asyncHandler(async (req, res) => {
  await db.raw('select 1 as ok');
  res.json({ ok: true, service: 'proagenda' });
}));

app.use('/api/login', authLimiter);
app.use('/api/auth', authLimiter);
app.use('/api', authRoutes);
app.use('/api/agendamentos', authRequired, agendamentosRoutes);
app.use('/api/clientes', authRequired, clientesRoutes);
app.use('/api/servicos', authRequired, servicosRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Recurso não encontrado.' });
});
app.use(errorHandler);

module.exports = app;
