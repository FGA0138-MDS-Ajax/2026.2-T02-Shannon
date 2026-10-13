# testes para hash e verificação de senha
from app.auth.security import hash_password, verify_password

# teste 1: verifica se a senha com hash != senha sem hash
def test_hash_password_returns_bcrypt_hash():
    password = "senhaForte123!"

    password_hash = hash_password(password)

    assert password_hash != password


# teste 2: verifica se a senha com hash começa com "$2b$"
def test_hash_password_starts_with_bcrypt_prefix():
    password = "senhaForte123!"

    password_hash = hash_password(password)

    assert password_hash.startswith("$2b$")


# teste 3: verifica se gera salt aleatório
def test_hash_password_generates_different_hashes():
    password = "senhaForte123!"

    password_hash1 = hash_password(password)
    password_hash2 = hash_password(password)

    assert password_hash1 != password_hash2


# teste 4: verifica se a senha corresponde ao hash bcrypt.
def test_password_corresponds_hash_bcrypt():
    password = "senhaForte123!"

    password_hash = hash_password(password)

    assert verify_password(password, password_hash) == True


# teste 5: senha errada é diferente da senha correta com hash
def test_wrong_password_does_not_match_hash():
    password = "senhaForte123!"
    wrong_password = "senhaForteCabrito123"

    password_hash = hash_password(password)

    assert verify_password(wrong_password, password_hash) == False


# teste 6: hash inválido
def test_verify_password_with_invalid_hash():
    password = "senhaForte123!"

    password_wrong_hash = "ablublublé123321"

    assert verify_password(password, password_wrong_hash) == False
