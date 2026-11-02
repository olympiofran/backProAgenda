const app = require('./app');
const config = require('./config');
const db = require('./db');

db.raw('select 1')
  .then(() => {
    app.listen(config.port, () => {
      console.log(`ProAgenda API em http://localhost:${config.port}`);
    });
  })
  .catch((err) => {
    console.error('Não foi possível conectar ao MySQL. Suba o banco com: npm run db:up');
    console.error(err.message);
    process.exit(1);
  });
