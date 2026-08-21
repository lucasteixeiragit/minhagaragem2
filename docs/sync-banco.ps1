# ============================================================
# SCRIPT: sync-banco.ps1
# DESCRICAO: Sincroniza o banco MongoDB do servidor Oracle
#            para o MongoDB local (desenvolvimento).
# FLUXO:
#   1. Gera um dump do banco no servidor (mongodump)
#   2. Transfere o dump para o PC (scp via SSH)
#   3. Importa no MongoDB local (mongorestore --drop)
#   4. Limpa os arquivos temporarios
# USO:  powershell -ExecutionPolicy Bypass -File scripts\sync-banco.ps1
# ============================================================

# ============================================================
# CONFIGURACOES (ajuste se necessario)
# ============================================================
$SSH_HOST   = "oracle"                 # alias do ~/.ssh/config (servidor)
$DB_NAME    = "minhagaragem"           # nome do banco
$REMOTE_DIR = "/home/ubuntu/dump_sync" # pasta temporaria no servidor
$LOCAL_DIR  = Join-Path $env:TEMP "dump_sync"  # pasta temporaria no PC

# Caminho das ferramentas MongoDB no PC (instaladas via MongoDB Database Tools)
$MONGO_TOOLS = "C:\Program Files\MongoDB\Tools\100\bin"
$MONGORESTORE = Join-Path $MONGO_TOOLS "mongorestore.exe"

# ============================================================
# FUNCOES AUXILIARES
# ============================================================
function Write-Step($msg) {
    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor Cyan
}

function Test-Command($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Host "ERRO: '$name' nao encontrado. Verifique se o SSH esta instalado." -ForegroundColor Red
        exit 1
    }
}

# ============================================================
# VALIDACOES INICIAIS
# ============================================================
Write-Step "Validando ferramentas"

Test-Command "ssh"
Test-Command "scp"

if (-not (Test-Path $MONGORESTORE)) {
    Write-Host "ERRO: mongorestore nao encontrado em $MONGORESTORE" -ForegroundColor Red
    Write-Host "Instale o MongoDB Database Tools: winget install --id MongoDB.DatabaseTools" -ForegroundColor Yellow
    exit 1
}

# ============================================================
# PASSO 1: Dump no servidor
# ============================================================
Write-Step "Passo 1/4 - Gerando dump no servidor ($SSH_HOST)"

ssh -o BatchMode=yes $SSH_HOST "rm -rf $REMOTE_DIR && mongodump --db $DB_NAME --out $REMOTE_DIR"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: falha ao gerar o dump no servidor." -ForegroundColor Red
    exit 1
}
Write-Host "Dump gerado no servidor." -ForegroundColor Green

# ============================================================
# PASSO 2: Transferir para o PC
# ============================================================
Write-Step "Passo 2/4 - Transferindo dump para o PC"

if (Test-Path $LOCAL_DIR) { Remove-Item $LOCAL_DIR -Recurse -Force }
scp -r -o BatchMode=yes "${SSH_HOST}:$REMOTE_DIR" $LOCAL_DIR
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: falha ao transferir o dump." -ForegroundColor Red
    exit 1
}
Write-Host "Dump transferido para $LOCAL_DIR" -ForegroundColor Green

# ============================================================
# PASSO 3: Restore no MongoDB local
# ============================================================
Write-Step "Passo 3/4 - Importando no MongoDB local"

& $MONGORESTORE --drop --db $DB_NAME (Join-Path $LOCAL_DIR $DB_NAME)
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: falha ao importar no MongoDB local." -ForegroundColor Red
    exit 1
}
Write-Host "Banco local atualizado com os dados do servidor." -ForegroundColor Green

# ============================================================
# PASSO 4: Limpeza
# ============================================================
Write-Step "Passo 4/4 - Limpando arquivos temporarios"

ssh -o BatchMode=yes $SSH_HOST "rm -rf $REMOTE_DIR"
if (Test-Path $LOCAL_DIR) { Remove-Item $LOCAL_DIR -Recurse -Force }
Write-Host "Temporarios removidos." -ForegroundColor Green

# ============================================================
# CONCLUSAO
# ============================================================
Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  Sincronizacao concluida com sucesso!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "O banco local '$DB_NAME' agora tem os mesmos dados do servidor." -ForegroundColor White
Write-Host "Para rodar o sistema localmente: npm run dev" -ForegroundColor White
