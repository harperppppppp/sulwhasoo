# Sulwhasoo

설화수 브랜드 웹사이트 정적 퍼블리싱 프로젝트 (HTML/CSS/JS, 빌드 도구 없음).

## 폴더 구조

```
sulwhasoo/
│
├── index.html                # 메인 페이지 (Home)
│
├── pages/                    # 서브페이지
│   ├── product.html          # 제품 목록 페이지
│   ├── product-detail.html   # 제품 상세 페이지
│   ├── culture.html          # 브랜드 문화 및 헤리티지 페이지
│   └── flagship.html         # 설화수 플래그십 스토어 페이지
│
├── css/
│   ├── reset.css              # 브라우저 기본 스타일 초기화
│   ├── variables.css          # 컬러, 폰트, 간격 등 디자인 토큰
│   ├── common.css             # Header, Footer 등 공통 스타일
│   ├── components.css         # 버튼, 카드, 배지 등 공통 컴포넌트
│   ├── home.css / product.css / detail.css / culture.css / flagship.css
│   └── responsive.css         # 반응형 스타일
│
├── js/
│   ├── common.js / home.js / product.js / detail.js / culture.js / flagship.js
│   └── animation.js           # 공통 애니메이션
│
├── assets/                    # 페이지별 리소스
│   ├── home/{images,videos}/
│   ├── product/{images,videos}/
│   ├── product-detail/{images,videos}/
│   ├── culture/{images,videos}/
│   ├── flagship/{images,videos}/
│   ├── common/                # 공통 리소스
│   │   ├── icons/             # 아이콘 (SNS 아이콘 등)
│   │   ├── logos/             # 로고
│   │   ├── backgrounds/       # 공통 배경 (footer-bg 등)
│   │   └── patterns/          # 패턴, 텍스처
│   └── fonts/                 # 웹폰트
│
└── .gitignore
```

## 페이지 경로 규칙

- 루트의 `index.html`은 `css/`, `js/`, `assets/`를 상대경로로 바로 참조합니다.
- `pages/*.html`은 한 단계 아래에 있으므로 `../css/`, `../js/`, `../assets/`로 참조합니다.
- 각 페이지 전용 이미지/영상은 `assets/<page>/images/`, `assets/<page>/videos/`에 둡니다.
- 여러 페이지에서 같이 쓰는 아이콘·로고·배경·패턴은 `assets/common/` 아래에 둡니다.

## 현재 진행 상태

- ✅ `pages/culture.html` — 히어로, 슬로건, Room01~03, 반응형 푸터까지 구현 완료
- ⬜ `index.html`, `pages/product.html`, `pages/product-detail.html`, `pages/flagship.html` — 골격만 있고 콘텐츠 미구현
- ⬜ `css/common.css` — culture 페이지의 푸터 스타일을 공용화해서 옮기면 다른 페이지에서도 재사용 가능

## 참고

- `assets/culture/images/`, `css/culture.css`, `js/culture.js`의 에셋/URL은 Figma 원본이 아닌 프로젝트 내 로컬 파일로 저장되어 있습니다 (Figma 자산 URL은 7일 후 만료).
