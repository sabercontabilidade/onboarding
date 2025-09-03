"""
Script para testar os modelos SQLAlchemy criados
"""
from datetime import date, datetime, time
from backend.database import SessionLocal
from backend.models import Usuario, Cliente, Contato, Agendamento, Visita, GoogleToken

def test_create_sample_data():
    """Cria dados de exemplo para testar os modelos"""
    db = SessionLocal()
    
    try:
        # Criar um usuário de exemplo
        usuario = Usuario(
            nome="João Silva Santos",
            email="joao.silva@saber.com.br",
            papel="Colab. Onboarding",
            google_connected=False
        )
        db.add(usuario)
        db.commit()
        db.refresh(usuario)
        print(f"✓ Usuário criado: {usuario}")
        
        # Criar um cliente de exemplo
        cliente = Cliente(
            nome="Tech Solutions Ltda",
            cnpj="12.345.678/0001-90",
            data_inicio_contrato=date(2024, 1, 15),
            data_reuniao_inicial=date(2024, 1, 20),
            contatos_empresa=[
                {
                    "nome": "Maria Santos",
                    "email": "maria@techsolutions.com.br",
                    "telefone": "(11) 98765-4321",
                    "cargo": "CEO"
                }
            ],
            canais=["EMAIL", "WHATSAPP", "VIDEOCHAMADA"],
            autorizacoes_documentos={
                "contrato_social": True,
                "cartao_cnpj": True,
                "certidoes": False
            },
            status_onboarding="REUNIAO_AGENDADA",
            status_relacionamento="PENDENTE",
            responsavel_followup_id=usuario.id,
            observacoes="Cliente com grande potencial de crescimento"
        )
        db.add(cliente)
        db.commit()
        db.refresh(cliente)
        print(f"✓ Cliente criado: {cliente}")
        print(f"  CNPJ normalizado: {cliente.get_cnpj_normalizado()}")
        
        # Criar um contato de exemplo
        contato = Contato(
            cliente_id=cliente.id,
            tipo="REUNIAO_INICIAL",
            data=date(2024, 1, 20),
            hora_inicio=time(14, 0),
            hora_fim=time(15, 30),
            participantes=["João Silva", "Maria Santos", "Carlos Tech"],
            descricao="Reunião inicial para apresentação dos serviços e levantamento de necessidades",
            canal="VIDEOCHAMADA",
            observacoes="Cliente demonstrou grande interesse nos serviços fiscais"
        )
        db.add(contato)
        db.commit()
        db.refresh(contato)
        print(f"✓ Contato criado: {contato}")
        
        # Criar um agendamento de exemplo
        agendamento = Agendamento(
            tipo="D15",
            cliente_id=cliente.id,
            responsavel_id=usuario.id,
            data_agendada=datetime(2024, 2, 5, 10, 0),
            titulo="Acompanhamento D+15 - Tech Solutions",
            descricao="Primeira verificação após 15 dias do início do contrato",
            status="PENDENTE",
            local="Escritório do cliente",
            observacoes="Verificar se documentação foi enviada"
        )
        db.add(agendamento)
        db.commit()
        db.refresh(agendamento)
        print(f"✓ Agendamento criado: {agendamento}")
        
        # Criar uma visita de exemplo
        visita = Visita(
            cliente_id=cliente.id,
            data=date(2024, 1, 25),
            local="Rua das Empresas, 123 - São Paulo/SP",
            tipo_visita="INSTALACAO",
            pauta=[
                "Instalação do sistema fiscal",
                "Treinamento básico da equipe",
                "Configuração inicial"
            ],
            assuntos=[
                "Sistema instalado com sucesso",
                "Equipe treinada nos módulos básicos",
                "Configurações personalizadas realizadas"
            ],
            decisoes=[
                "Treinamento avançado será agendado para próxima semana",
                "Suporte técnico será disponibilizado por 30 dias"
            ],
            pendencias=[
                "Aguardar envio de documentos adicionais",
                "Configurar backup automático"
            ],
            satisfacao=9,
            participantes=["João Silva", "Maria Santos", "Equipe TI"],
            observacoes="Visita bem-sucedida, cliente muito satisfeito"
        )
        db.add(visita)
        db.commit()
        db.refresh(visita)
        print(f"✓ Visita criada: {visita}")
        
        print("\n🎉 Todos os modelos foram testados com sucesso!")
        print(f"📊 Total de registros criados:")
        print(f"   - Usuários: {db.query(Usuario).count()}")
        print(f"   - Clientes: {db.query(Cliente).count()}")
        print(f"   - Contatos: {db.query(Contato).count()}")
        print(f"   - Agendamentos: {db.query(Agendamento).count()}")
        print(f"   - Visitas: {db.query(Visita).count()}")
        
    except Exception as e:
        print(f"❌ Erro ao criar dados de exemplo: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Testando modelos SQLAlchemy...")
    test_create_sample_data()