# Stock Journal

개인용 주식 매매일지 웹앱입니다.

브라우저에서 아래 기능을 바로 사용할 수 있습니다.

- 거래 입력 / 수정 / 삭제
- 일별 손익 달력
- 오늘 / 이번 주 / 이번 달 손익 요약
- JSON 백업 / 복원
- `localStorage` 기반 데이터 저장

## 파일 구성

- `index.html`: 메인 화면
- `style.css`: 디자인 스타일
- `script.js`: 거래 저장, 달력, 통계, 백업/복원 기능

## 로컬 실행

정적 사이트라서 별도 설치는 필요 없습니다.

### 방법 1

`index.html`을 브라우저에서 직접 열기

### 방법 2

VS Code `Live Server`로 실행

## GitHub Pages 배포

1. GitHub에서 새 저장소 생성
2. 이 폴더를 업로드
3. GitHub 저장소에서 `Settings > Pages` 이동
4. `Source`를 `Deploy from a branch`로 선택
5. 브랜치 `main`, 폴더 `/(root)` 선택
6. 저장 후 배포 주소 확인

배포 주소 예시:

`https://github아이디.github.io/저장소이름/`

## 데이터 저장 방식

기록은 브라우저의 `localStorage`에 저장됩니다.

따라서 아래 경우 데이터가 다르게 보일 수 있습니다.

- 브라우저가 다른 경우
- 기기가 다른 경우
- 사이트 데이터를 삭제한 경우

중요한 데이터는 `백업` 버튼으로 JSON 파일로 저장해두는 것을 권장합니다.

