@echo off
echo === ImagePress Setup ===

echo.
echo [1/4] Setting up Python backend...
cd backend
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
cd ..

echo.
echo [2/4] Setting up frontend...
cd frontend
npm install
cd ..

echo.
echo === Setup complete! ===
echo.
echo Run the backend:
echo   cd backend ^& venv\Scripts\activate ^& uvicorn main:app --reload --port 8000
echo.
echo Run the frontend (in a new terminal):
echo   cd frontend ^& npm run dev
echo.
pause
