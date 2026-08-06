# Sulwhasoo

설화수 브랜드 웹사이트 정적 퍼블리싱 프로젝트 (HTML/CSS/JS, 빌드 도구 없음).

## 폴더 구조

```
sulwhasoo/
│
├── index.html                          # 메인 페이지 (Home)
│
├── pages/                              # 서브페이지
│   ├── product.html                    # 제품 목록
│   ├── product-detail.html             # 제품 상세
│   ├── culture.html                    # 브랜드 문화 및 헤리티지
│   └── flagship.html                   # 설화수 플래그십 스토어
│
├── css/                                # 스타일 파일
│   ├── reset.css                       # 브라우저 기본 스타일 초기화
│   ├── variables.css                   # 컬러, 폰트, 간격 등 디자인 토큰
│   ├── common.css                      # Header, Footer, Layout 공통 스타일
│   ├── components.css                  # Button, Card, Modal 등 공통 컴포넌트
│   ├── home.css                        # 메인 페이지 스타일
│   ├── product.css                     # 제품 목록 페이지 스타일
│   ├── detail.css                      # 제품 상세 페이지 스타일
│   ├── culture.css                     # Culture 페이지 스타일
│   ├── flagship.css                    # Flagship 페이지 스타일
│   └── responsive.css                  # 반응형 스타일
│
├── js/                                 # JavaScript
│   ├── common.js                       # 공통 기능(Header, Menu 등)
│   ├── home.js                         # 메인 페이지 기능
│   ├── product.js                      # 제품 목록 기능
│   ├── detail.js                       # 제품 상세 기능
│   ├── culture.js                      # Culture 페이지 기능
│   ├── flagship.js                     # Flagship 페이지 기능
│   └── animation.js                    # 공통 애니메이션
│
├── assets/                             # 프로젝트 리소스
│   ├── home/                           # 메인 페이지 리소스
│   │   ├── images/                     # 메인 이미지
│   │   └── videos/                     # 메인 영상
│   │
│   ├── product/                        # 제품 목록 리소스
│   │   ├── images/                     # 제품 목록 이미지
│   │   └── videos/                     # 제품 목록 영상
│   │
│   ├── product-detail/                 # 제품 상세 리소스
│   │   ├── images/                     # 제품 상세 이미지
│   │   └── videos/                     # 제품 상세 영상
│   │
│   ├── culture/                        # Culture 리소스
│   │   ├── images/                     # Culture 이미지
│   │   └── videos/                     # Culture 영상
│   │
│   ├── flagship/                       # Flagship 리소스
│   │   ├── images/                     # Flagship 이미지
│   │   └── videos/                     # Flagship 영상
│   │
│   ├── common/                         # 공통 리소스
│   │   ├── icons/                      # 아이콘
│   │   ├── logos/                      # 로고
│   │   ├── backgrounds/                # 공통 배경 이미지
│   │   └── patterns/                   # 패턴 및 텍스처
│   │
│   └── fonts/                          # 웹폰트
│
├── README.md                           # 프로젝트 소개 및 실행 방법
└── .gitignore                          # Git 업로드 제외 파일
```

## 📄 페이지 구성

| 페이지 | 파일명 |
|---|---|
| Home | index.html |
| Product | product.html |
| Product Detail | product-detail.html |
| Culture | culture.html |
| Flagship Store | flagship.html |

## 📌 CSS 관리

- `reset.css` : 브라우저 기본 스타일 초기화
- `variables.css` : 컬러, 폰트, 간격 등 디자인 토큰
- `common.css` : Header, Footer, Layout
- `components.css` : Button, Card, Modal 등 공통 컴포넌트
- 각 페이지 CSS : 해당 페이지 전용 스타일
- `responsive.css` : 반응형 스타일

## 📌 JavaScript 관리

- `common.js` : 공통 기능
- `animation.js` : GSAP, ScrollTrigger 등 애니메이션
- 페이지별 JS : 해당 페이지 기능만 작성

## 📌 Assets 관리

- 페이지별 리소스는 각 페이지 폴더(`home`, `product`, `product-detail`, `culture`, `flagship`)에서 관리
- 공통 리소스는 `common` 폴더에서 관리
- 폰트는 `fonts` 폴더에서 관리

## 페이지 경로 규칙

- 루트의 `index.html`은 `css/`, `js/`, `assets/`를 상대경로로 바로 참조합니다.
- `pages/*.html`은 한 단계 아래에 있으므로 `../css/`, `../js/`, `../assets/`로 참조합니다.

## 현재 진행 상태

- ✅ `pages/culture.html` — 히어로, 슬로건, Room01~03, 반응형 푸터까지 구현 완료
- ⬜ `index.html`, `pages/product.html`, `pages/product-detail.html`, `pages/flagship.html` — 골격만 있고 콘텐츠 미구현
- ⬜ `css/common.css` — culture 페이지의 푸터 스타일을 공용화해서 옮기면 다른 페이지에서도 재사용 가능

## 참고

- `assets/culture/images/`, `css/culture.css`, `js/culture.js`의 에셋/URL은 Figma 원본이 아닌 프로젝트 내 로컬 파일로 저장되어 있습니다 (Figma 자산 URL은 7일 후 만료).
