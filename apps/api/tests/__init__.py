import os

# Antes de qualquer `import app`: os testes nunca falam com o armazenamento real,
# mesmo que o `.env` local aponte para o R2.
os.environ["STORAGE_BACKEND"] = "memory"
