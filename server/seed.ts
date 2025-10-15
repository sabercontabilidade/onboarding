import dotenv from 'dotenv';
// Carregar variáveis de ambiente ANTES de importar qualquer outro módulo
dotenv.config();

import { db, pool } from './db.js';
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

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
