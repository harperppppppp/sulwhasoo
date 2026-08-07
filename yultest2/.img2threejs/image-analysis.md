# Sulwhasoo First Care Activating Serum VI — image analysis

## 1. Identification

- 대상은 단일 화장품 세럼 병이다. `primaryDomain`은 `object`, 형식은 실시간 브라우저 hero prop이다.
- 정면 병 하나가 흰 배경 위에 완전히 노출되어 있으며 식별 신뢰도는 0.99다.

## 2. Overall form and silhouette

- 전체 바운딩 볼륨은 세로로 긴 모서리 라운드 직육면체 두 개(본체, 캡)와 얇은 결합 링의 조합이다.
- 본체는 상부 어깨가 넓고 중간이 거의 평행하며 하단으로 완만하게 좁아진다. 하단 모서리는 큰 반경으로 둥글다.
- 캡은 본체보다 좁고 길며 위쪽이 약간 넓고, 상단과 측면 전이가 둥글다.
- 정면 실루엣은 수직 중심선 기준 양측 대칭이다. 깊이는 보이지 않아 정면 폭의 약 44%로 추정한다.

## 3. Macro / meso / micro decomposition

- Macro: `bottle_body`, `cap`.
- Meso: `neck_ring`, `shoulder_seam`, `front_copy_decal`, `brand_decal`.
- Micro: 본체와 캡의 실재 bevel, 전면 상단의 회색 3행 copy, 하단의 주황색 Sulwhasoo wordmark, 아이보리 표면의 미세한 저주파 색 변화.

## 4. Spatial relationships

- `<cap, above-and-socketed-to, neck_ring>`: 캡 하단이 얇은 목 링 위에 겹쳐 연결된다.
- `<neck_ring, flush-with, bottle_body shoulder>`: 본체 상단 중앙에 밀착한다.
- `<front_copy_decal, conforming-to, bottle_body front>` 및 `<brand_decal, conforming-to, bottle_body lower-front>`: 두 인쇄면은 본체 앞쪽에만 있다.

## 5. Materials and surface

- 본체/캡은 비금속 아이보리 코팅 재질이다. `metalness 0`, 중저 `roughness`, 얕은 `clearcoat`가 정면의 넓은 하이라이트와 가장자리 림을 만든다.
- 목 링은 같은 계열이나 조금 더 어둡고 거친 표면이다.
- 전면 copy는 회색 저채도 인쇄, 브랜드 표기는 고채도 주황 인쇄다. 두 영역은 relief 없는 decal이다.

## 6. Color and finish

- 본체 albedo: 따뜻한 아이보리, 중앙은 밝고 측면은 약간 베이지/회색으로 내려간다.
- cap albedo: 본체보다 조금 더 밝은 아이보리.
- finish: satin-gloss dielectric, 가장자리에는 실제 bevel로 생기는 밝은 rim highlight가 있다.

## 7. Identity-defining features

- 상부 3행 `FIRST CARE / ACTIVATING SERUM VI / SÉRUM ACTIVATEUR VI` 회색 copy.
- 하부 전면을 넓게 가로지르는 주황색 `Sulwhasoo` wordmark.
- 좁고 긴 캡, 얇은 어깨 seam, 아래로 좁아지는 본체 실루엣.
- 중심부의 넓고 부드러운 아이보리 하이라이트와 양 측면의 따뜻한 음영.

## 8. Uncertainty and single-image limits

- 측면/후면과 실제 단면은 숨겨져 있다. 깊이와 후면 표면은 전면 대칭 및 일반적인 병 구조로 추정한다.
- 사진의 wordmark 글꼴을 그대로 복제할 폰트 파일은 제공되지 않아 Georgia italic 기반의 근사 canvas decal을 사용한다.
- 제조 치수나 정확한 재질 채널은 알 수 없으므로 실시간 hero render에 맞춘 시각적 근사다.

