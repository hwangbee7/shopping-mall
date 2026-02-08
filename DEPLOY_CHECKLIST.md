# Cloudtype + Vercel 배포 체크리스트

로그인 오류·상품 미노출 해결을 위해 **반드시 확인할 항목**입니다.

---

## 1. 수정 사항 요약 (데이터 유실 여부)

**우리가 변경한 파일은 다음 두 개뿐입니다.**
- `server/package.json` → `mongodb` 패키지 제거 (MongoDB 4.0 호환용)
- `server/index.js` → 네이티브 `MongoClient` 제거, Mongoose만 사용

**삭제·수정하지 않은 것**
- 어드민 페이지 (AdminPage, ProductManagePage, ProductRegisterPage) → **그대로 있음**
- 상품/유저/주문/장바구니 모델·라우트·컨트롤러 → **그대로 있음**
- DB를 비우거나 삭제하는 코드는 **추가·변경한 적 없음**

**상품이 안 보이는 이유로 추정되는 것**
- Cloudtype 서버가 MongoDB 연결 오류로 **계속 종료**되어 있어서 API가 실패했거나
- Cloudtype에서 쓰는 DB가 **Atlas가 아니라 내부 MongoDB**(`mongo:27017`)라서, 예전에 Atlas에만 등록해 두었던 데이터는 **지금 연결된 DB에는 없을 수 있음**

→ **코드로 인해 데이터가 날아간 것은 아닙니다.**  
→ 서버만 정상 기동하고, **지금 연결된 DB에 다시 상품을 등록**하면 메인에 다시 뜹니다.

---

## 2. Cloudtype 필수 체크

| 항목 | 확인 방법 | 권장 설정 |
|------|------------|-----------|
| **서비스 상태** | 대시보드에서 서비스가 초록(실행 중)인지 확인 | 정상 실행 중 |
| **환경 변수** | 서비스 설정 → 환경 변수 | `MONGODB_URL`: Cloudtype에서 제공한 내부 DB 주소 (예: `mongodb://admin:비밀번호@mongo:27017`) |
| **JWT 시크릿** | 같은 환경 변수 탭 | `JWT_SECRET`: 임의의 긴 문자열 (없으면 기본값 사용 가능하나, 배포 시 설정 권장) |
| **Node 버전** | 빌드/런타임 설정 | **18.x** (`package.json`의 `engines`와 맞추기) |
| **빌드/시작 명령** | 서비스가 `server` 폴더 기준인지 | 루트가 `server`이면: 빌드 `npm install`, 시작 `npm start` (또는 `node index.js`) |
| **포트** | Cloudtype이 주입하는 `PORT` 사용 여부 | `index.js`에서 `process.env.PORT || 5000` 사용 중이면 OK |
| **배포 URL** | 서비스 상세에서 확인 | 예: `https://port-0-shopping-mall-xxxx.sel3.cloudtype.app` → 이 주소가 `client/src/api.js`의 `baseURL`과 일치하는지 확인 |

**직접 확인**
- 브라우저에서 `https://port-0-shopping-mall-mkrzhfy7035ed316.sel3.cloudtype.app/api/health` 접속  
  → `{"ok":true,"message":"서버 연결됨"}` 비슷한 JSON이 보이면 서버는 동작 중.

---

## 2-1. 서버 연결이 수차례 푸시해도 안 될 때 (진단 순서)

1. **로그인 페이지의 "서버 연결" 표시 확인**  
   - 배포된 로그인 페이지에 **「✅ 서버 연결됨」** / **「❌ 서버 연결 실패: …」** 가 뜹니다.  
   - 실패 시 표시된 **「연결 테스트 주소 열기」** 링크를 눌러 보세요.

2. **헬스 주소를 브라우저 주소창에서 직접 열기**  
   - 주소: `https://[Cloudtype서비스URL]/api/health`  
   - **JSON이 보이면** → 서버는 살아 있음. **CORS** 또는 **클라이언트 API 주소 불일치** 가능성.  
   - **안 열리거나 오류 페이지** → Cloudtype 서버가 떠 있지 않음. 3번으로.

3. **Cloudtype 배포 로그 확인**  
   - 서비스 → **로그** 또는 **배포 로그**에서  
     - `✅ MongoDB 연결 성공`, `🚀 서버가 ... 에서 실행 중` 이 있는지 확인.  
   - **MongoDB 연결 실패** 등 에러가 있으면 → 환경 변수 `MONGODB_URL` 값과 Cloudtype 내부 DB 설정을 다시 확인.

4. **Cloudtype 서비스 URL이 바뀌었는지 확인**  
   - 서비스를 새로 만들었다면 **배포 URL이 이전과 다를 수 있습니다.**  
   - Vercel → 프로젝트 → **Settings → Environment Variables** 에서  
     - `VITE_API_URL` = `https://[지금_사용하는_Cloudtype_URL]/api`  
     로 설정한 뒤 **재배포**하세요. (끝에 `/api` 포함, 마지막 슬래시 제외)

5. **같은 레포/브랜치에서 배포되는지 확인**  
   - Cloudtype이 연결된 **저장소·브랜치**가 지금 푸시하는 곳과 같은지 확인.  
   - 다르면 해당 브랜치로 푸시하거나, Cloudtype에서 연결 브랜치를 변경.

---

## 3. Vercel 필수 체크

| 항목 | 확인 방법 | 권장 설정 |
|------|------------|-----------|
| **프로젝트 연결** | Vercel 대시보드 | 이 레포의 `client`(또는 루트)가 연결되어 있어야 함 |
| **빌드 설정** | Project Settings → General | Root Directory: `client` (또는 프론트가 있는 디렉터리) |
| **빌드/출력** | Build & Development | Build Command: `npm run build`, Output Directory: `dist` (Vite 기본) |
| **환경 변수** (선택) | Environment Variables | Cloudinary 사용 시: `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` |
| **접속 URL** | 배포 후 도메인 | 프로덕션: `todo-react-8rt5.vercel.app`, 프리뷰: `todo-react-8rt5-git-main-xxx.vercel.app` 등 → **서버 CORS에서 둘 다 허용하도록 이미 수정됨** |

**주의**
- 로그인/API는 **Cloudtype 백엔드**로 가야 하므로, Vercel에는 **API 키 같은 건 없어도 됨**.  
- `client/src/api.js`의 `baseURL`이 **현재 Cloudtype 서비스 URL**과 정확히 같아야 함.

---

## 4. 연결 확인 순서

1. **Cloudtype**
   - 최신 코드로 재배포 (`server/package.json`, `server/index.js` 반영)
   - 로그에서 `✅ MongoDB 연결 성공`, `🚀 서버가 ... 에서 실행 중` 확인
   - 브라우저에서 `https://[당신의-Cloudtype-URL]/api/health` 접속 → JSON 응답 확인

2. **Vercel**
   - 최신 코드로 배포 후, 로그인 페이지 접속
   - **프로덕션 URL**(`todo-react-8rt5.vercel.app`)로 접속해 보기 (프리뷰 URL이 아닌)
   - 그래도 안 되면: F12 → Network에서 `/api/auth/login` 요청이 **실패(빨간색)** 인지, **CORS 에러**인지 확인

3. **상품 다시 노출**
   - Cloudtype 서비스가 정상 기동된 뒤, **어드민으로 로그인** → 상품 다시 등록  
   - DB가 Cloudtype 내부 MongoDB라면, 예전 Atlas 데이터는 없으므로 **재등록이 필요**합니다.

---

## 5. CORS 수정 내용 (이번에 반영된 것)

- **원인:** 접속 URL이 `todo-react-8rt5-git-main-eunbee-hwangs-projects.vercel.app`(프리뷰)인데, 서버는 `todo-react-8rt5.vercel.app`만 허용해서 **CORS로 막혀** "서버에 연결할 수 없습니다"로 보였을 수 있음.
- **조치:** `server/index.js`와 `server/controllers/authController.js`에서  
  `todo-react-8rt5.vercel.app`뿐 아니라 **`todo-react-8rt5-`로 시작하는 모든 Vercel URL**(프리뷰 포함)을 허용하도록 수정함.
- **필수:** 이 수정이 적용된 **최신 서버 코드**를 Cloudtype에 **다시 배포**해야 로그인이 됩니다.

---

정리하면, **기존 데이터를 지우는 수정은 하지 않았고**, 로그인 오류는 **CORS + 서버 URL/배포 상태** 때문일 가능성이 큽니다.  
위 체크리스트대로 Cloudtype·Vercel을 점검하고, 서버를 재배포한 뒤 **프로덕션 URL**로 로그인해 보시면 됩니다.
