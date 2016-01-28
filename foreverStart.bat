SET mydir=%~dp0
SET logfile=%mydir%logs\forever.log

forever --uid egam -a -l %logfile% -o logs\app.log -e logs\error.log start ./bin/www
