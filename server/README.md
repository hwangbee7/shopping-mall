# Shopping Mall Server

Node.js, Express, MongoDB를 사용한 쇼핑몰 데모 서버입니다.

## 설치 방법

1. 의존성 패키지 설치:
```bash
npm install
```

2. 환경 변수 설정 (선택사항):
`.env` 파일을 생성하고 다음 내용을 추가하세요:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017
DB_NAME=shopping_mall
```

## 실행 방법

```bash
npm start
```

서버가 `http://localhost:3000`에서 실행됩니다.

## API 엔드포인트

### 상품 (Products)
- `GET /api/products` - 모든 상품 조회
- `GET /api/products/:id` - 특정 상품 조회
- `POST /api/products` - 새 상품 생성
- `PUT /api/products/:id` - 상품 수정
- `DELETE /api/products/:id` - 상품 삭제

### 사용자 (Users)
- `GET /api/users` - 모든 사용자 조회
- `GET /api/users/:id` - 특정 사용자 조회
- `POST /api/users` - 새 사용자 생성
- `PUT /api/users/:id` - 사용자 정보 수정
- `DELETE /api/users/:id` - 사용자 삭제

### 주문 (Orders)
- `GET /api/orders` - 모든 주문 조회
- `GET /api/orders/:id` - 특정 주문 조회
- `POST /api/orders` - 새 주문 생성
- `PUT /api/orders/:id` - 주문 수정
- `DELETE /api/orders/:id` - 주문 삭제

## 요구사항

- Node.js (v14 이상)
- MongoDB (로컬 또는 원격)

## 기술 스택

- Node.js
- Express.js
- MongoDB
- CORS
- dotenv
