# testes para consultas por ID, username e emails.

from sqlmodel import Session
from uuid import uuid4
from datetime import datetime, timedelta, timezone

from app.auth.models import User, AuthSession
from app.auth.repository import get_user_by_id, get_user_by_username, get_user_by_email, create_session, rotate_session, delete_session, delete_user_sessions
from tests.support.db import db_connection


# teste 1: verifica se retorna o usuário correto pelo id
def test_get_user_by_id_returns_existing_users(connection_url):
    engine = db_connection(connection_url)

    with Session(engine) as session:
        user = User(
            name="Pablo Barros", 
            username="pablindoidao", 
            email="pablindoidao@gmail.com",
            password_hash="$2b$abublé"
        )

        session.add(user)
        session.commit()

        user_found = get_user_by_id(session, user.id)

        assert user_found is not None
        assert user_found.id == user.id


# teste 2: verifica se retorna None quando user não existe (pelo id)
def test_get_user_by_id_returns_none_when_user_does_not_exist(connection_url):
    engine = db_connection(connection_url)

    with Session(engine) as session:
        user_id = uuid4()

        user_found = get_user_by_id(session, user_id)

        assert user_found is None


# teste 3: verifica se retorna o usuário correto pelo username
def test_get_user_by_username_returns_existing_user(connection_url):
    engine = db_connection(connection_url)

    with Session(engine) as session:
        user = User(
            name="Pablo Barros", 
            username="pablindoidao", 
            email="pablindoidao@gmail.com",
            password_hash="$2b$abublé"
        )

        session.add(user)
        session.commit()

        user_found = get_user_by_username(session, user.username)

        assert user_found is not None
        assert user_found.username == user.username


# teste 4: verifica se retorna None quando user não existe (pelo username)
def test_get_user_by_username_returns_none_when_user_does_not_exist(connection_url):
    engine = db_connection(connection_url)

    with Session(engine) as session:

        user_found = get_user_by_username(session, "doidin_do_centro")


    assert user_found is None


# teste 5: verifica se retorna o usuário correto pelo email
def test_get_user_by_email_returns_existing_user(connection_url):
    engine = db_connection(connection_url)

    with Session(engine) as session:
        user = User(
            name="Pablo Barros", 
            username="pablindoidao", 
            email="pablindoidao@gmail.com",
            password_hash="$2b$abublé"
        )

        session.add(user)
        session.commit()

        user_found = get_user_by_email(session, user.email)

        assert user_found is not None
        assert user_found.email == user.email


# teste 6: verifica se retorna None quando user não existe (pelo email)
def test_get_user_by_email_returns_none_when_user_does_not_exist(connection_url):
    engine = db_connection(connection_url)

    with Session(engine) as session:

        user_found = get_user_by_email(session, "pablolindao@gmail.com")


    assert user_found is None


# teste 7: verifica se create_session adiciona uma sessão sem fazer commit
def test_create_session_adds_auth_session_without_committing(connection_url):
    engine = db_connection(connection_url)

    with Session(engine) as session:
        user = User(
            name="Pablo Barros",
            username="pablindoidao",
            email="pablindoidao@gmail.com",
            password_hash="$2b$abublé"
        )

        session.add(user)
        session.commit()

        session_id = uuid4()
        jti = uuid4()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=4)

        create_session(session, user.id, session_id, jti, expires_at)

        assert any(
            isinstance(obj, AuthSession) and obj.id == session_id
            for obj in session.new
        )


# teste 8: testa se a rotate session atualiza a access session
def test_rotate_session_updates_existing_session(connection_url):
    engine = db_connection(connection_url)

    with Session(engine) as session:
        user = User(
            name="Pablo Barros",
            username="pablindoidao",
            email="pablindoidao@gmail.com",
            password_hash="$2b$abublé"
        )

        session.add(user)
        session.commit()

        session_id = uuid4()
        jti_atual = uuid4()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=4)

        auth_session = AuthSession(
            id=session_id,
            user_id=user.id,
            current_jti=jti_atual,
            expires_at=expires_at
        )

        session.add(auth_session)
        session.commit()

        novo_jti = uuid4()
        nova_expiracao = datetime.now(timezone.utc) + timedelta(hours=8)

        resultado = rotate_session(
            session,
            session_id,
            jti_atual,
            novo_jti,
            nova_expiracao
        )

        session.refresh(auth_session)

        assert resultado == user.id
        assert auth_session.current_jti == novo_jti
        assert auth_session.expires_at == nova_expiracao
        assert auth_session.last_used_at is not None


# teste 9: remover uma sessão existente
def test_delete_session_removes_existing_session(connection_url):
    engine = db_connection(connection_url)

    with Session(engine) as session:
        user = User(
            name="Pablo Barros",
            username="pablindoidao",
            email="pablindoidao@gmail.com",
            password_hash="$2b$abublé"
        )

        session.add(user)
        session.commit()

        session_id = uuid4()
        jti_atual = uuid4()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=4)

        auth_session = AuthSession(
            id=session_id,
            user_id=user.id,
            current_jti=jti_atual,
            expires_at=expires_at
        )

        session.add(auth_session)
        session.commit()

        delete_session(session, session_id)

        resultado = session.get(AuthSession, session_id)

        assert resultado is None


# teste 10: 
def test_delete_user_sessions_removes_all_user_sessions(connection_url):
    engine = db_connection(connection_url)

    with Session(engine) as session:
        user = User(
            name="Pablo Barros",
            username="pablindoidao",
            email="pablindoidao@gmail.com",
            password_hash="$2b$abublé"
        )

        session.add(user)
        session.commit()

        session_id_1 = uuid4()
        session_id_2 = uuid4()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=4)

        auth_session_1 = AuthSession(
            id=session_id_1,
            user_id=user.id,
            current_jti=uuid4(),
            expires_at=expires_at
        )

        auth_session_2 = AuthSession(
            id=session_id_2,
            user_id=user.id,
            current_jti=uuid4(),
            expires_at=expires_at
        )

        session.add(auth_session_1)
        session.add(auth_session_2)
        session.commit()

        delete_user_sessions(session, user.id)

        resultado_1 = session.get(AuthSession, session_id_1)
        resultado_2 = session.get(AuthSession, session_id_2)

        assert resultado_1 is None
        assert resultado_2 is None


# teste 11: rotate_session() com jti incorreto
def test_rotate_session_returns_none_when_jti_does_not_match(connection_url):
    engine = db_connection(connection_url)

    with Session(engine) as session:
        user = User(
            name="Pablo Barros",
            username="pablindoidao",
            email="pablindoidao@gmail.com",
            password_hash="$2b$abublé"
        )
        session.add(user)
        session.commit()

        session_id = uuid4()
        jti_atual = uuid4()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=4)

        auth_session = AuthSession(
            id=session_id,
            user_id=user.id,
            current_jti=jti_atual,
            expires_at=expires_at
        )
        session.add(auth_session)
        session.commit()

        jti_incorreto = uuid4()
        novo_jti = uuid4()
        nova_expiracao = datetime.now(timezone.utc) + timedelta(hours=8)

        resultado = rotate_session(
            session,
            session_id,
            jti_incorreto,
            novo_jti,
            nova_expiracao
        )

        session.refresh(auth_session)

        assert resultado is None
        assert auth_session.current_jti == jti_atual
        assert auth_session.expires_at == expires_at


# teste 12: rotate_session() com sessão inexistente
def test_rotate_session_returns_none_when_session_does_not_exist(connection_url):
    engine = db_connection(connection_url)

    with Session(engine) as session:
        session_id = uuid4()
        presented_jti = uuid4()
        new_jti = uuid4()
        new_expires_at = datetime.now(timezone.utc) + timedelta(hours=8)

        resultado = rotate_session(
            session,
            session_id,
            presented_jti,
            new_jti,
            new_expires_at
        )

        assert resultado is None


# teste 13: delete_session() com sessão inexistente
def test_delete_session_does_nothing_when_session_does_not_exist(connection_url):
    engine = db_connection(connection_url)

    with Session(engine) as session:
        session_id = uuid4()

        delete_session(session, session_id)

        resultado = session.get(AuthSession, session_id)

        assert resultado is None


# teste 14: delete_session() preserva as outras sessões
def test_delete_session_does_not_remove_other_sessions(connection_url):
    engine = db_connection(connection_url)

    with Session(engine) as session:
        user = User(
            name="Pablo Barros",
            username="pablindoidao",
            email="pablindoidao@gmail.com",
            password_hash="$2b$abublé"
        )
        session.add(user)
        session.commit()

        expires_at = datetime.now(timezone.utc) + timedelta(hours=4)
        session_id_1 = uuid4()
        session_id_2 = uuid4()

        auth_session_1 = AuthSession(
            id=session_id_1,
            user_id=user.id,
            current_jti=uuid4(),
            expires_at=expires_at
        )
        auth_session_2 = AuthSession(
            id=session_id_2,
            user_id=user.id,
            current_jti=uuid4(),
            expires_at=expires_at
        )

        session.add(auth_session_1)
        session.add(auth_session_2)
        session.commit()

        delete_session(session, session_id_1)

        resultado_1 = session.get(AuthSession, session_id_1)
        resultado_2 = session.get(AuthSession, session_id_2)

        assert resultado_1 is None
        assert resultado_2 is not None


# teste 15: delete_user_sessions() preserva as sessões de outros usuários
def test_delete_user_sessions_does_not_remove_other_users_sessions(connection_url):
    engine = db_connection(connection_url)

    with Session(engine) as session:
        user_1 = User(
            name="Pablo Barros",
            username="pablindoidao",
            email="pablindoidao@gmail.com",
            password_hash="$2b$abublé"
        )
        user_2 = User(
            name="Ana Silva",
            username="anasilva",
            email="anasilva@gmail.com",
            password_hash="$2b$abublé"
        )

        session.add(user_1)
        session.add(user_2)
        session.commit()

        expires_at = datetime.now(timezone.utc) + timedelta(hours=4)

        session_id_1 = uuid4()
        session_id_2 = uuid4()
        session_id_3 = uuid4()

        auth_session_1 = AuthSession(
            id=session_id_1,
            user_id=user_1.id,
            current_jti=uuid4(),
            expires_at=expires_at
        )
        auth_session_2 = AuthSession(
            id=session_id_2,
            user_id=user_1.id,
            current_jti=uuid4(),
            expires_at=expires_at
        )
        auth_session_3 = AuthSession(
            id=session_id_3,
            user_id=user_2.id,
            current_jti=uuid4(),
            expires_at=expires_at
        )

        session.add(auth_session_1)
        session.add(auth_session_2)
        session.add(auth_session_3)
        session.commit()

        delete_user_sessions(session, user_1.id)

        resultado_1 = session.get(AuthSession, session_id_1)
        resultado_2 = session.get(AuthSession, session_id_2)
        resultado_3 = session.get(AuthSession, session_id_3)

        assert resultado_1 is None
        assert resultado_2 is None
        assert resultado_3 is not None


# teste 16: Verificar que delete_user_sessions() não executa commit()
def test_delete_session_does_not_commit(connection_url):
    engine = db_connection(connection_url)

    with Session(engine) as session:
        user = User(
            name="Pablo Barros",
            username="pablindoidao",
            email="pablindoidao@gmail.com",
            password_hash="$2b$abublé"
        )
        session.add(user)
        session.commit()

        session_id = uuid4()
        auth_session = AuthSession(
            id=session_id,
            user_id=user.id,
            current_jti=uuid4(),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=4)
        )

        session.add(auth_session)
        session.commit()

        delete_session(session, session_id)

        with Session(engine) as another_session:
            resultado = another_session.get(AuthSession, session_id)

            assert resultado is not None

        session.rollback()


