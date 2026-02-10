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
    execSync('npx prisma migrate deploy --skip-generate', { 
      stdio: 'inherit',
      env: { ...process.env },
      timeout: 60000 // Timeout de 60 segundos
    });
    
    console.log('✅ Migrações aplicadas! Banco de dados pronto.');
  } catch (error) {
    const errorMessage = error.message || '';
    const errorOutput = (error.stdout?.toString() || error.stderr?.toString() || '');
    
    if (errorMessage.includes('timeout')) {
      console.error('⏱️  Timeout ao verificar banco de dados. Tentando db push...');
    } else {
      console.warn('⚠️  migrate deploy falhou:', errorMessage);
      console.log('🔄 Tentando db push para sincronizar schema...');
    }
    
    // Fallback: db push sincroniza o schema mesmo sem histórico de migrações
    try {
      execSync('npx prisma db push --skip-generate --accept-data-loss', {
        stdio: 'inherit',
        env: { ...process.env },
        timeout: 60000
      });
      console.log('✅ Banco de dados sincronizado via db push.');
    } catch (pushError) {
      console.error('❌ Erro crítico ao sincronizar banco:', pushError.message);
      console.log('ℹ️  Aplicação iniciará, mas pode falhar em operações de banco.');
    }
  }
}

// Sempre executa (tanto em produção quanto em desenvolvimento)
createUploadDirectories();
checkAndCreateTables();
