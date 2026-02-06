/**
 * Windows에서 5000 포트를 사용 중인 프로세스를 종료합니다.
 * 서버가 EADDRINUSE로 시작되지 않을 때: npm run kill5000 후 npm run dev
 */
const { execSync, spawnSync } = require('child_process');
const isWin = process.platform === 'win32';

try {
  if (isWin) {
    const out = execSync('netstat -ano | findstr :5000', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    const lines = out.trim().split(/\r?\n/).filter(Boolean);
    const pids = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0' && /^\d+$/.test(pid)) pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' });
        console.log('Port 5000 freed (PID ' + pid + ')');
      } catch (e) {
        // 이미 종료됐거나 권한 없음
      }
    }
    if (pids.size === 0) console.log('Port 5000 is not in use.');
  } else {
    execSync("lsof -ti :5000 | xargs kill -9 2>/dev/null || echo 'Port 5000 is not in use.'", { stdio: 'inherit' });
  }
} catch (e) {
  if (e.status === 1 && e.stdout === '') {
    console.log('Port 5000 is not in use.');
  } else {
    console.error(e.message || e);
  }
}
