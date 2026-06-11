# SEA GVI Aging Management Dashboard

Samsung Electronics SEA GVI Aging Management 대시보드입니다.

## 기능

- **KPI 카드**: Total Units, 31~60 Days, 61~90 Days, 91~120 Days, 121+ Days
- **Location Distribution**: 위치별 Aging 기간 분포 (Stacked Bar Chart)
- **Aging Severity**: Aging 심각도 분포 (Doughnut Chart)
- **Top 10 Models**: 모델별 Aging 현황 (Horizontal Stacked Bar Chart)
- **Grade Distribution**: 위치별 등급 분포 (Stacked Bar Chart)
- **Storage Distribution**: 용량별 분포 (Doughnut Chart)
- **Aging Days Distribution**: Aging 일수 히스토그램 (Bar Chart)
- **IMEI Detail Table**: 위치별 IMEI 상세 조회 (탭, 정렬, 검색, Excel 다운로드)

## 사용 방법

1. `index.html`을 브라우저에서 엽니다.
2. 로그인 (ID: `user`, PW: `user`)
3. Excel 파일을 업로드하거나, `Aging_IMEI_List.xlsx` 파일을 같은 폴더에 두면 자동 로드됩니다.

## Excel 파일 형식

다음 컬럼이 포함된 Excel 파일이 필요합니다:

| 컬럼명 | 설명 |
|--------|------|
| Final IMEI | IMEI 번호 |
| MKT Name | 모델명 |
| Storage | 용량 |
| Grade | 등급 |
| Aging Days | Aging 일수 |
| Aging Period | Aging 기간 (자동 계산 가능) |
| Location | 위치 |
| Transaction | 거래 유형 |

## GitHub 배포

이 프로젝트는 GitHub Pages를 통해 배포할 수 있습니다:

1. GitHub에 새 repository 생성
2. `git remote add origin <repository-url>`
3. `git push -u origin main`
4. GitHub Settings > Pages > Source를 `main` 브랜치로 설정

## 기술 스택

- HTML5 + CSS3 + Vanilla JavaScript
- [Chart.js](https://www.chartjs.org/) - 차트 렌더링
- [SheetJS](https://sheetjs.com/) - Excel 파일 파싱
