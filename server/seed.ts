import dotenv from 'dotenv';
// Carregar variáveis de ambiente ANTES de importar qualquer outro módulo
dotenv.config();

import { db, pool } from './db.js';
import { users, setores, perfis, userSetores, permissaoCatalogo, perfilSetorPermissao } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';

// Dados dos setores (8 setores conforme mapeamento)
const setoresData = [
  { codigo: 'sistema', nome: 'Sistema', cor: '#6366f1', icone: 'Bot', isSystem: true, ordem: 0, descricao: 'Setor virtual para automações e notificações do sistema' },
  { codigo: 'comercial', nome: 'Comercial', cor: '#22c55e', icone: 'Briefcase', isSystem: false, ordem: 1, descricao: 'Captação e fechamento de novos clientes' },
  { codigo: 'sucesso_cliente', nome: 'Sucesso do Cliente', cor: '#8b5cf6', icone: 'Heart', isSystem: false, ordem: 2, descricao: 'Onboarding e relacionamento com clientes' },
  { codigo: 'societario', nome: 'Societário', cor: '#f59e0b', icone: 'Building', isSystem: false, ordem: 3, descricao: 'Legalização e constituição de empresas' },
  { codigo: 'contabil', nome: 'Contábil', cor: '#3b82f6', icone: 'Calculator', isSystem: false, ordem: 4, descricao: 'Serviços contábeis e balanços' },
  { codigo: 'fiscal', nome: 'Fiscal', cor: '#ef4444', icone: 'FileText', isSystem: false, ordem: 5, descricao: 'Obrigações fiscais e tributárias' },
  { codigo: 'dp', nome: 'Departamento Pessoal', cor: '#ec4899', icone: 'Users', isSystem: false, ordem: 6, descricao: 'Folha de pagamento e obrigações trabalhistas' },
  { codigo: 'financeiro', nome: 'Financeiro', cor: '#14b8a6', icone: 'DollarSign', isSystem: false, ordem: 7, descricao: 'Gestão financeira e cobranças' },
];

// Dados dos perfis (3 perfis base)
const perfisData = [
  { codigo: 'gestor', nome: 'Gestor', nivelHierarquico: 1, descricao: 'Gestão completa do setor, pode atribuir tarefas e gerenciar usuários' },
  { codigo: 'operador', nome: 'Operador', nivelHierarquico: 2, descricao: 'Executa tarefas, acesso operacional ao setor' },
  { codigo: 'analista', nome: 'Analista', nivelHierarquico: 3, descricao: 'Apenas visualização e análise de dados do setor' },
];

// Catálogo de permissões
const permissoesData = [
  // Onboarding
  { codigo: 'onboarding:stages:view', nome: 'Visualizar Etapas', modulo: 'onboarding', categoria: 'stages' },
  { codigo: 'onboarding:stages:create', nome: 'Criar Etapas', modulo: 'onboarding', categoria: 'stages' },
  { codigo: 'onboarding:stages:update', nome: 'Atualizar Etapas', modulo: 'onboarding', categoria: 'stages' },
  { codigo: 'onboarding:stages:delete', nome: 'Deletar Etapas', modulo: 'onboarding', categoria: 'stages' },
  { codigo: 'onboarding:stages:assign', nome: 'Atribuir Etapas', modulo: 'onboarding', categoria: 'stages' },

  // Clientes
  { codigo: 'clientes:cadastro:view', nome: 'Visualizar Clientes', modulo: 'clientes', categoria: 'cadastro' },
  { codigo: 'clientes:cadastro:create', nome: 'Criar Clientes', modulo: 'clientes', categoria: 'cadastro' },
  { codigo: 'clientes:cadastro:update', nome: 'Atualizar Clientes', modulo: 'clientes', categoria: 'cadastro' },
  { codigo: 'clientes:cadastro:delete', nome: 'Deletar Clientes', modulo: 'clientes', categoria: 'cadastro' },

  // Agendamentos
  { codigo: 'agendamentos:reunioes:view', nome: 'Visualizar Agendamentos', modulo: 'agendamentos', categoria: 'reunioes' },
  { codigo: 'agendamentos:reunioes:create', nome: 'Criar Agendamentos', modulo: 'agendamentos', categoria: 'reunioes' },
  { codigo: 'agendamentos:reunioes:update', nome: 'Atualizar Agendamentos', modulo: 'agendamentos', categoria: 'reunioes' },
  { codigo: 'agendamentos:reunioes:delete', nome: 'Deletar Agendamentos', modulo: 'agendamentos', categoria: 'reunioes' },

  // Visitas
  { codigo: 'visitas:atas:view', nome: 'Visualizar Visitas', modulo: 'visitas', categoria: 'atas' },
  { codigo: 'visitas:atas:create', nome: 'Criar Visitas', modulo: 'visitas', categoria: 'atas' },
  { codigo: 'visitas:atas:update', nome: 'Atualizar Visitas', modulo: 'visitas', categoria: 'atas' },

  // Usuários
  { codigo: 'usuarios:gestao:view', nome: 'Visualizar Usuários', modulo: 'usuarios', categoria: 'gestao' },
  { codigo: 'usuarios:gestao:create', nome: 'Criar Usuários', modulo: 'usuarios', categoria: 'gestao' },
  { codigo: 'usuarios:gestao:update', nome: 'Atualizar Usuários', modulo: 'usuarios', categoria: 'gestao' },
  { codigo: 'usuarios:gestao:delete', nome: 'Deletar Usuários', modulo: 'usuarios', categoria: 'gestao' },

  // Relatórios
  { codigo: 'relatorios:dashboard:view', nome: 'Visualizar Dashboard', modulo: 'relatorios', categoria: 'dashboard' },
  { codigo: 'relatorios:exportar:execute', nome: 'Exportar Relatórios', modulo: 'relatorios', categoria: 'exportar' },

  // Auditoria
  { codigo: 'auditoria:logs:view', nome: 'Visualizar Logs', modulo: 'auditoria', categoria: 'logs' },

  // Configurações
  { codigo: 'configuracoes:sistema:manage', nome: 'Gerenciar Sistema', modulo: 'configuracoes', categoria: 'sistema' },
  { codigo: 'configuracoes:setores:manage', nome: 'Gerenciar Setores', modulo: 'configuracoes', categoria: 'setores' },
];

// Mapeamento de permissões por perfil (global - sem setor específico)
const perfilPermissoesMap: Record<string, string[]> = {
  gestor: [
    // Todas as permissões de view/create/update para onboarding, clientes, agendamentos, visitas
    'onboarding:stages:view', 'onboarding:stages:create', 'onboarding:stages:update', 'onboarding:stages:assign',
    'clientes:cadastro:view', 'clientes:cadastro:create', 'clientes:cadastro:update',
    'agendamentos:reunioes:view', 'agendamentos:reunioes:create', 'agendamentos:reunioes:update', 'agendamentos:reunioes:delete',
    'visitas:atas:view', 'visitas:atas:create', 'visitas:atas:update',
    'usuarios:gestao:view',
    'relatorios:dashboard:view', 'relatorios:exportar:execute',
  ],
  operador: [
    // Permissões de view e create
    'onboarding:stages:view', 'onboarding:stages:update',
    'clientes:cadastro:view', 'clientes:cadastro:update',
    'agendamentos:reunioes:view', 'agendamentos:reunioes:create', 'agendamentos:reunioes:update',
    'visitas:atas:view', 'visitas:atas:create', 'visitas:atas:update',
    'relatorios:dashboard:view',
  ],
  analista: [
    // Apenas visualização
    'onboarding:stages:view',
    'clientes:cadastro:view',
    'agendamentos:reunioes:view',
    'visitas:atas:view',
    'relatorios:dashboard:view',
  ],
};

async function seedSetores() {
  console.log('\n📦 Seeding setores...');

  for (const setor of setoresData) {
    const existing = await db.select().from(setores).where(eq(setores.codigo, setor.codigo)).limit(1);

    if (existing.length > 0) {
      console.log(`   ✓ Setor "${setor.nome}" já existe`);
      continue;
    }

    await db.insert(setores).values(setor);
    console.log(`   + Setor "${setor.nome}" criado`);
  }

  console.log('✅ Setores configurados!');
}

async function seedPerfis() {
  console.log('\n👤 Seeding perfis...');

  for (const perfil of perfisData) {
    const existing = await db.select().from(perfis).where(eq(perfis.codigo, perfil.codigo)).limit(1);

    if (existing.length > 0) {
      console.log(`   ✓ Perfil "${perfil.nome}" já existe`);
      continue;
    }

    await db.insert(perfis).values(perfil);
    console.log(`   + Perfil "${perfil.nome}" criado`);
  }

  console.log('✅ Perfis configurados!');
}

async function assignRootToSetores(rootUserId: string) {
  console.log('\n🔗 Atribuindo ROOT aos setores...');

  // Buscar o perfil gestor
  const gestorPerfil = await db.select().from(perfis).where(eq(perfis.codigo, 'gestor')).limit(1);
  if (gestorPerfil.length === 0) {
    console.log('   ⚠ Perfil "gestor" não encontrado, pulando atribuição');
    return;
  }

  // Buscar todos os setores (exceto sistema)
  const todosSetores = await db.select().from(setores).where(eq(setores.isSystem, false));

  for (const setor of todosSetores) {
    const existing = await db
      .select()
      .from(userSetores)
      .where(eq(userSetores.userId, rootUserId))
      .limit(1);

    // Verificar se já existe relação com este setor
    const existingSetor = existing.find(us => us.setorId === setor.id);
    if (existingSetor) {
      console.log(`   ✓ ROOT já está no setor "${setor.nome}"`);
      continue;
    }

    // Atribuir ROOT como gestor do setor (primeiro setor é principal)
    await db.insert(userSetores).values({
      userId: rootUserId,
      setorId: setor.id,
      perfilId: gestorPerfil[0].id,
      principal: setor.codigo === 'comercial', // Comercial como setor principal
    });
    console.log(`   + ROOT atribuído ao setor "${setor.nome}" como Gestor`);
  }

  console.log('✅ ROOT configurado em todos os setores!');
}

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    // Seed de setores e perfis primeiro
    await seedSetores();
    await seedPerfis();

    // Verificar se as variáveis de ambiente do ROOT existem
    const rootId = process.env.ROOT_ID;
    const rootName = process.env.ROOT_NAME || 'Root';
    const rootEmail = process.env.ROOT_EMAIL;
    const rootSenha = process.env.ROOT_SENHA;
    const rootFuncao = process.env.ROOT_FUNCAO || 'admin';
    const rootFoto = process.env.ROOT_FOTO;

    if (!rootEmail || !rootSenha) {
      throw new Error('ROOT_EMAIL e ROOT_SENHA são obrigatórios no arquivo .env');
    }

    console.log(`📧 Verificando usuário ROOT: ${rootEmail}`);

    // Verificar se o usuário ROOT já existe
    const existingRoot = await db
      .select()
      .from(users)
      .where(eq(users.email, rootEmail))
      .limit(1);

    if (existingRoot.length > 0) {
      console.log('✅ Usuário ROOT já existe no banco de dados');
      console.log(`   ID: ${existingRoot[0].id}`);
      console.log(`   Nome: ${existingRoot[0].nome}`);
      console.log(`   Email: ${existingRoot[0].email}`);
      console.log(`   Função: ${existingRoot[0].funcao}`);
      console.log(`   Nível: ${existingRoot[0].nivelPermissao}`);

      // Atribuir ROOT aos setores (mesmo que já exista)
      await assignRootToSetores(existingRoot[0].id);
      return;
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(rootSenha, 10);

    // Criar usuário ROOT
    const newRoot = await db.insert(users).values({
      id: rootId,
      nome: rootName,
      email: rootEmail,
      senhaHash,
      funcao: rootFuncao as any,
      nivelPermissao: 'administrador',
      fotoUrl: rootFoto,
      ativo: true,
      bloqueado: false,
      tentativasLogin: 0,
      permissoes: {
        clientes: { criar: true, editar: true, deletar: true, visualizar: true },
        onboarding: { iniciar: true, editar: true, visualizar: true },
        agendamentos: { criar: true, editar: true, deletar: true, visualizar: true },
        visitas: { criar: true, editar: true, deletar: true, visualizar: true },
        usuarios: { criar: true, editar: true, deletar: true, visualizar: true },
        relatorios: { exportar: true, visualizar: true },
      },
      preferencias: {
        tema: 'system',
        idioma: 'pt-BR',
        notificacoes: true,
        emailNotificacoes: true,
      },
    }).returning();

    console.log('✅ Usuário ROOT criado com sucesso!');
    console.log(`   ID: ${newRoot[0].id}`);
    console.log(`   Nome: ${newRoot[0].nome}`);
    console.log(`   Email: ${newRoot[0].email}`);
    console.log(`   Função: ${newRoot[0].funcao}`);
    console.log(`   Nível: ${newRoot[0].nivelPermissao}`);
    console.log('');
    console.log('🔐 Credenciais de acesso:');
    console.log(`   Email: ${rootEmail}`);
    console.log(`   Senha: ${rootSenha}`);

    // Atribuir ROOT aos setores
    await assignRootToSetores(newRoot[0].id);

  } catch (error) {
    console.error('❌ Erro ao executar seed:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('');
    console.log('🏁 Seed finalizado!');
    process.exit(0);
  }
}

seed();
