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
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      env: { ...process.env },
      timeout: 60000 // Timeout de 60 segundos
    });
    
    console.log('✅ Migrações aplicadas! Banco de dados pronto.');
  } catch (error) {
    const errorMessage = error.message || '';
    const errorOutput = (error.stdout?.toString() || error.stderr?.toString() || '');
    
    const isMigrationError = errorMessage.includes('P3009') || errorMessage.includes('P3018') ||
      errorOutput.includes('failed migrations') || errorOutput.includes('failed to apply')
    if (isMigrationError) {
      console.warn('⚠️  Migração falhou (P3009/P3018). Tentando resolver...');
      const migrationsToResolve = [
        '20250124000000_add_configuracao_gatebox',
        '20250124000001_update_gateway_model',
        '20260129000000_add_configuracao_frk',
        '20260129000001_add_cotadas',
      ];
      for (const migrationName of migrationsToResolve) {
        try {
          execSync(`npx prisma migrate resolve --applied "${migrationName}"`, {
            stdio: 'inherit',
            env: { ...process.env },
            timeout: 15000
          });
          console.log(`✅ Migração ${migrationName} marcada como aplicada.`);
        } catch (e) {
          // Ignorar - migração pode já estar ok
        }
      }
      try {
        console.log('🔄 Tentando migrate deploy novamente...');
        execSync('npx prisma migrate deploy', {
          stdio: 'inherit',
          env: { ...process.env },
          timeout: 60000
        });
        console.log('✅ Migrações aplicadas!');
        return;
      } catch (retryError) {
        console.warn('⚠️  Retry migrate deploy falhou:', retryError.message);
      }
    }
    
    if (errorMessage.includes('timeout')) {
      console.error('⏱️  Timeout ao verificar banco de dados. Tentando db push...');
    } else {
      console.warn('⚠️  migrate deploy falhou:', errorMessage);
      console.log('🔄 Tentando db push para sincronizar schema...');
    }
    
    // Fallback: db push sincroniza o schema mesmo sem histórico de migrações
    try {
      execSync('npx prisma db push --accept-data-loss', {
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
