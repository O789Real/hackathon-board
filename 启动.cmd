@echo off
chcp 65001 >nul
cd /d "%~dp0"

rem 用这台机器自带的 node / pnpm（不依赖全局 PATH）
set NODE=E:\deepseekharness\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe
set PNPM=E:\deepseekharness\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\pnpm\bin\pnpm.mjs

if not exist "node_modules" (
  echo 首次运行，正在安装依赖...
  "%NODE%" "%PNPM%" install --registry=https://registry.npmmirror.com
)

echo.
echo   启动中，3 秒后自动打开浏览器...
echo   地址：http://127.0.0.1:5173
echo   （关掉这个窗口 = 关掉服务；重启电脑后要再双击一次）
echo.

rem 等服务器起来再开浏览器
start "" cmd /c "timeout /t 4 >nul & start http://127.0.0.1:5173"

"%NODE%" "%PNPM%" dev --host 127.0.0.1 --port 5173 --strictPort
