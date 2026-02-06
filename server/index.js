const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_ATLAS_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'shopping_mall';

// 미들웨어 설정
// CORS - 우선 배포 성공을 위해 모든 오리진 허용 (로컬 + Vercel 등)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB 연결
let db;
let client;

async function connectDB() {
  try {
    // Mongoose 연결
    const mongooseUri = MONGODB_URI.includes('mongodb://') || MONGODB_URI.includes('mongodb+srv://') 
      ? `${MONGODB_URI}/${DB_NAME}` 
      : `mongodb://${MONGODB_URI}/${DB_NAME}`;
    
    await mongoose.connect(mongooseUri);
    console.log('✅ MongoDB (Mongoose) 연결 성공');
    
    // 기존 MongoDB 네이티브 드라이버 연결도 유지 (다른 API용)
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ MongoDB (Native) 연결 성공');
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error);
    process.exit(1);
  }
}

// 서버 시작
async function startServer() {
  try {
    // MongoDB 연결 먼저 완료
    await connectDB();
    
    // DB 연결 완료 후 라우터 require 및 등록 (모델 초기화가 DB 연결 이후에 이루어지도록 보장)
    console.log('📦 라우터 로드 중...');
    const userRoutes = require('./routes/userRoutes');
    const authRoutes = require('./routes/authRoutes');
    const productRoutes = require('./routes/productRoutes');
    const cartRoutes = require('./routes/cartRoutes');
    const orderRoutes = require('./routes/orderRoutes');
    
    // 라우터 등록 (app.listen 전에 반드시 실행)
    app.use('/api/users', userRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/cart', cartRoutes);
    app.use('/api/orders', orderRoutes);
    console.log('✅ 라우터 등록 완료');
    
    // 에러 핸들링 미들웨어 (라우터 등록 후)
    app.use((err, req, res, next) => {
      console.error('에러 발생:', err);
      res.status(500).json({ success: false, error: '서버 내부 오류가 발생했습니다.' });
    });
    
    // 404 핸들러 (모든 라우터 등록 후 마지막에 등록)
    app.use((req, res) => {
      res.status(404).json({ success: false, error: '요청한 경로를 찾을 수 없습니다.' });
    });
    
    // 라우터 등록 후 서버 시작 (5000 포트 사용 중이면 5001로 시도)
    let port = PORT;
    const tryListen = (p) => {
      const server = app.listen(p, () => {
        console.log(`🚀 서버가 http://localhost:${server.address().port} 에서 실행 중입니다.`);
      });
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          if (p === 5000) {
            console.warn('⚠️ 포트 5000이 이미 사용 중입니다. 5001 포트로 시도합니다.');
            console.warn('   client/vite.config.js 의 proxy target을 http://localhost:5001 로 변경한 뒤 클라이언트를 재시작하세요.');
            tryListen(5001);
          } else {
            console.error('❌ 포트 5000, 5001 모두 사용 중입니다. 기존 node 프로세스를 종료한 뒤 다시 실행하세요.');
            process.exit(1);
          }
        } else {
          throw err;
        }
      });
    };
    tryListen(port);
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
}

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: 'Shopping Mall API 서버가 정상적으로 작동 중입니다.',
    endpoints: {
      products: '/api/products',
      users: '/api/users',
      auth: '/api/auth',
      orders: '/api/orders',
      cart: '/api/cart'
    }
  });
});

// 프로세스 종료 시 MongoDB 연결 종료
process.on('SIGINT', async () => {
  console.log('\n서버 종료 중...');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('MongoDB (Mongoose) 연결이 종료되었습니다.');
  }
  if (client) {
    await client.close();
    console.log('MongoDB (Native) 연결이 종료되었습니다.');
  }
  process.exit(0);
});

// 서버 시작
startServer().catch(console.error);
