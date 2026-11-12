const bcrypt = require('bcryptjs');

const SERVICES = [
  { nome: 'Tatuagem personalizada', duracao_minutos: 120, preco: 450, categoria: 'Tatuagem' },
  { nome: 'Piercing', duracao_minutos: 30, preco: 80, categoria: 'Tatuagem' },
  { nome: 'Manutenção elétrica', duracao_minutos: 90, preco: 180, categoria: 'Eletricista' },
  { nome: 'Instalação de chuveiro', duracao_minutos: 60, preco: 150, categoria: 'Eletricista' },
  { nome: 'Bartender para evento', duracao_minutos: 180, preco: 350, categoria: 'Bartender' },
  { nome: 'Limpeza de pele', duracao_minutos: 60, preco: 160, categoria: 'Esteticista' },
  { nome: 'Design de sobrancelha', duracao_minutos: 45, preco: 70, categoria: 'Esteticista' },
  { nome: 'Massagem relaxante', duracao_minutos: 60, preco: 140, categoria: 'Esteticista' },
];

const CLIENTS = [
  { nome: 'Mariana Alves', telefone: '(11) 98812-4477', email: 'mariana.alves@email.com', observacoes: 'Prefere atendimento no período da tarde.' },
  { nome: 'Rafael Nogueira', telefone: '(21) 99640-1123', email: 'rafael.nogueira@email.com', observacoes: 'Cliente desde 2023.' },
  { nome: 'Juliana Prado', telefone: '(31) 98155-2087', email: 'juliana.prado@email.com', observacoes: '' },
  { nome: 'Diego Ferraz', telefone: '(48) 99210-7745', email: 'diego.ferraz@email.com', observacoes: 'Indicação de amigo.' },
  { nome: 'Camila Bastos', telefone: '(11) 98003-6612', email: 'camila.bastos@email.com', observacoes: '' },
  { nome: 'Bruno Tavares', telefone: '(85) 98774-3301', email: 'bruno.tavares@email.com', observacoes: 'Fatura para empresa.' },
];

// dia da semana (0 = segunda), início, fim, índice do cliente, índice do serviço, observações
const APPOINTMENTS = [
  [0, '09:00:00', '11:00:00', 0, 0, 'Projeto floral no antebraço.'],
  [0, '14:00:00', '14:30:00', 2, 1, ''],
  [1, '10:00:00', '11:00:00', 2, 5, ''],
  [1, '13:30:00', '15:00:00', 3, 2, 'Quadro elétrico da cozinha.'],
  [2, '09:00:00', '09:45:00', 4, 6, ''],
  [2, '15:00:00', '18:00:00', 5, 4, 'Coquetel para 30 pessoas.'],
  [3, '11:00:00', '12:00:00', 1, 7, ''],
  [3, '16:00:00', '18:00:00', 0, 0, ''],
  [4, '10:00:00', '11:00:00', 3, 3, ''],
  [5, '09:00:00', '09:30:00', 1, 1, ''],
  [7, '10:00:00', '12:00:00', 4, 0, ''],
  [9, '14:00:00', '15:30:00', 5, 2, ''],
];

function mondayOfThisWeek() {
  const now = new Date();
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const offset = (local.getDay() + 6) % 7;
  local.setDate(local.getDate() - offset);
  return local;
}

function isoDate(base, addDays) {
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + addDays);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

async function findOrCreate(knex, table, where, values) {
  const existing = await knex(table).where(where).first();
  if (existing) return existing;
  const inserted = await knex(table).insert({ ...where, ...values }).returning('id');
  const row = inserted[0];
  return { id: row && typeof row === 'object' ? row.id : row };
}

exports.seed = async function seed(knex) {
  await knex.transaction(async (trx) => {
    const senha = await bcrypt.hash('123456', 10);
    const cadastro = await findOrCreate(
      trx,
      'cadastro',
      { email: 'ana@proagenda.com' },
      {
        nome: 'Ana Ribeiro',
        telefone: '(11) 90000-0001',
        senha,
        servico: 'Tatuadora & Piercer',
        dia: null,
        horario: null,
      },
    );

    const serviceIds = [];
    for (const service of SERVICES) {
      const row = await findOrCreate(
        trx,
        'servicos',
        { cadastro_id: cadastro.id, nome: service.nome },
        {
          duracao_minutos: service.duracao_minutos,
          preco: service.preco,
          categoria: service.categoria,
        },
      );
      serviceIds.push(row.id);
    }

    const clientIds = [];
    for (const client of CLIENTS) {
      const row = await findOrCreate(
        trx,
        'clientes',
        { cadastro_id: cadastro.id, email: client.email },
        {
          nome: client.nome,
          telefone: client.telefone,
          observacoes: client.observacoes,
        },
      );
      clientIds.push(row.id);
    }

    const monday = mondayOfThisWeek();
    for (const [day, inicio, fim, clientIndex, serviceIndex, notes] of APPOINTMENTS) {
      const data = isoDate(monday, day);
      await findOrCreate(
        trx,
        'agendamentos',
        {
          cadastro_id: cadastro.id,
          data,
          inicio,
          cliente_nome: CLIENTS[clientIndex].nome,
        },
        {
          cliente_id: clientIds[clientIndex],
          servico_id: serviceIds[serviceIndex],
          fim,
          preco: SERVICES[serviceIndex].preco,
          status: 'confirmado',
          observacoes: notes,
        },
      );
    }
  });
};
