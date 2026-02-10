const { execSync } = require('child_process');
const { mkdirSync } = require('fs');
const { join } = require('path');

function createUploadDirectories() {
  try {
    console.log('📁 Criando diretórios de upload...');
    const baseDir = join(process.cwd(), 'public', 'uploads');
    const dirs = ['banners', 'logos', 'stories'];
    
    dirs.forEach(dir => {
      const dirPath = join(baseDir, dir);
      try {
        mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Diretório criado: ${dirPath}`);
      } catch (err) {
        if (err.code !== 'EEXIST') {
          console.error(`⚠️  Erro ao criar diretório ${dirPath}:`, err.message);
        }
      }
    });
  } catch (error) {
    console.error('⚠️  Erro ao criar diretórios de upload:', error.message);
  }
}

function checkAndCreateTables() {
  try {
    console.log('🔄 Aplicando migrações do banco de dados...');
    
    // Executa migrate deploy para aplicar migrações pendentes automaticamente
    // Usa --skip-generate para não regenerar o client (já foi gerado no build)
    execSync('npx prisma migrate deploy --skip-generate', { 
      stdio: 'inherit',
      env: { ...process.env },
      timeout: 60000 // Timeout de 60 segundos
    });
    
    console.log('✅ Migrações aplicadas! Banco de dados pronto.');
  } catch (error) {
    // Se der erro, verifica se é porque as tabelas já existem ou outro erro
    const errorMessage = error.message || '';
    const errorOutput = error.stdout?.toString() || error.stderr?.toString() || '';
    
    if (
      errorMessage.includes('already exists') || 
      errorMessage.includes('P3009') ||
      errorOutput.includes('already exists') ||
      errorOutput.includes('P3009') ||
      errorOutput.includes('in sync')
    ) {
      console.log('✅ Tabelas já existem no banco de dados');
    } else if (errorMessage.includes('timeout')) {
      console.error('⏱️  Timeout ao verificar banco de dados. Continuando...');
    } else {
      console.error('⚠️  Aviso ao verificar banco de dados:', errorMessage);
      console.log('ℹ️  Continuando com o start da aplicação...');
    }
  }
}

// Sempre executa (tanto em produção quanto em desenvolvimento)
createUploadDirectories();
checkAndCreateTables();
