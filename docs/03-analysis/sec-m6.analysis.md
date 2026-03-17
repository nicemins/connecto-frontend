# SEC-M6 Certificate Pinning Analysis Report

> **Analysis Type**: Gap Analysis (Security Implementation)
>
> **Project**: Connecto (React Native + Expo)
> **Analyst**: gap-detector
> **Date**: 2026-03-17
> **Design Doc**: CLAUDE.md SEC-M6

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

SEC-M6 requires Android certificate pinning to prevent MITM attacks on production API/Socket traffic. This analysis verifies the implementation against CLAUDE.md requirements.

### 1.2 Analysis Scope

- **Design Document**: `CLAUDE.md` SEC-M6 section
- **Implementation Files**:
  - `android/app/src/main/res/xml/network_security_config.xml` (release)
  - `android/app/src/debug/res/xml/network_security_config.xml` (debug)
  - `android/app/src/main/AndroidManifest.xml` (main manifest)
  - `android/app/src/debug/AndroidManifest.xml` (debug manifest)

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 Requirement Checklist

| # | Requirement (CLAUDE.md) | Implementation | Status |
|---|------------------------|----------------|--------|
| 1 | `network_security_config.xml` 도입 | `main/res/xml/network_security_config.xml` 생성됨 | ✅ Match |
| 2 | `api.connecto.app` 피닝 대상 | `<domain>api.connecto.app</domain>` 포함 | ✅ Match |
| 3 | `socket.connecto.app` 피닝 대상 | `<domain>socket.connecto.app</domain>` 포함 | ✅ Match |
| 4 | SPKI SHA-256 해시 적용 | PLACEHOLDER 해시 (AAA.../BBB...) 상태 | ⚠️ Intentional |
| 5 | AndroidManifest에 `networkSecurityConfig` 속성 | `android:networkSecurityConfig="@xml/network_security_config"` 확인 | ✅ Match |
| 6 | 디버그 빌드 피닝 비활성화 | `debug/res/xml/` 오버라이드 파일 존재, 피닝 없음 | ✅ Match |
| 7 | 디버그 cleartext 허용 | `cleartextTrafficPermitted="true"` + debug AndroidManifest `usesCleartextTraffic="true"` | ✅ Match |
| 8 | 백업 핀 포함 | Let's Encrypt ISRG Root X1 백업 핀 슬롯 존재 | ✅ Match |
| 9 | SPKI 해시 추출 명령 문서화 | XML 주석에 openssl 명령어 5단계 포함 | ✅ Match |
| 10 | PLACEHOLDER 상태 명시 | `TODO` 주석 + "PLACEHOLDER 상태에서 release 빌드 API 차단" 명시 | ✅ Match |
| 11 | pin-set expiration 설정 | `expiration="2027-06-01"` 설정됨 | ✅ Match |
| 12 | `includeSubdomains` 비활성화 | `includeSubdomains="false"` (정확한 도메인만 매칭) | ✅ Match |
| 13 | 릴리즈 cleartext 차단 | `cleartextTrafficPermitted="false"` | ✅ Match |
| 14 | 디버그 trust-anchors에 user 인증서 포함 | `<certificates src="user"/>` 포함 (Charles Proxy 등 디버깅 도구 지원) | ✅ Match |

### 2.2 구현 품질 세부 평가

#### network_security_config.xml (Release)

| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| XML 선언 | `<?xml version="1.0" encoding="utf-8"?>` | 동일 | ✅ |
| 루트 요소 | `<network-security-config>` | 동일 | ✅ |
| domain-config 구조 | `<domain-config>` with pin-set | 동일 | ✅ |
| 핀 개수 | 최소 2개 (leaf + backup) | 2개 | ✅ |
| digest 알고리즘 | SHA-256 | SHA-256 | ✅ |

#### network_security_config.xml (Debug)

| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| 피닝 없음 | pin-set 미포함 | 미포함 | ✅ |
| cleartext 허용 | `cleartextTrafficPermitted="true"` | 동일 | ✅ |
| system CA 신뢰 | `<certificates src="system"/>` | 포함 | ✅ |
| user CA 신뢰 | `<certificates src="user"/>` | 포함 | ✅ |

#### AndroidManifest.xml (Main)

| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| `networkSecurityConfig` 속성 | `@xml/network_security_config` | `android:networkSecurityConfig="@xml/network_security_config"` (application 태그) | ✅ |

#### AndroidManifest.xml (Debug)

| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| `usesCleartextTraffic` | `true` | `android:usesCleartextTraffic="true"` | ✅ |
| `tools:replace` | 존재 | `tools:replace="android:usesCleartextTraffic"` | ✅ |

### 2.3 CLAUDE.md 문서 동기화

| Item | Updated | Status |
|------|---------|--------|
| SEC-M6 상태 변경 | `⏳` -> `✅ 완료 (2026-03-17)` | ✅ |
| 구현 현황 테이블에 항목 추가 | "인증서 피닝 인프라 (SEC-M6)" 행 존재 | ✅ |
| PLACEHOLDER 경고 문구 | "배포 전 PLACEHOLDER 해시를 실제 SPKI 해시로 교체 필수" 명시 | ✅ |
| 마지막 업데이트 날짜 | 2026-03-17 | ✅ |

---

## 3. Match Rate Summary

```
+---------------------------------------------+
|  Overall Match Rate: 96%                     |
+---------------------------------------------+
|  ✅ Match:           13 items (93%)           |
|  ⚠️ Intentional gap:  1 item  ( 7%)           |
|  ❌ Not implemented:   0 items ( 0%)           |
+---------------------------------------------+
```

**Intentional Gap Detail**:

| Item | Description | Risk | Mitigation |
|------|-------------|------|------------|
| SPKI 해시 PLACEHOLDER | 프로덕션 인증서 미발급 상태이므로 실제 해시 추출 불가 | 릴리즈 빌드 API 차단 (안전 방향 실패) | 배포 파이프라인에서 해시 교체 단계 추가 필요 |

---

## 4. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 96% | ✅ |
| Architecture Compliance | 100% | ✅ |
| Convention Compliance | 95% | ✅ |
| Documentation Sync | 100% | ✅ |
| **Overall** | **96%** | ✅ |

### Convention Compliance Detail

| Rule | Status | Notes |
|------|--------|-------|
| XML 파일명 snake_case | ✅ | `network_security_config.xml` |
| 디버그/릴리즈 소스셋 분리 | ✅ | `src/main/` vs `src/debug/` |
| 주석 한국어/영어 혼용 일관성 | ⚠️ | XML 주석은 한국어, 기술 명령어는 영어 (프로젝트 관례와 일치) |

---

## 5. Recommended Actions

### 5.1 Immediate (Before Release Build)

| Priority | Item | Description |
|----------|------|-------------|
| 1 | SPKI 해시 교체 | 프로덕션 인증서 발급 후 XML 주석의 openssl 명령으로 해시 추출 -> PLACEHOLDER 교체 |
| 2 | expiration 날짜 조정 | 인증서 만료일 -30일로 `expiration` 값 갱신 |
| 3 | 핀 교체 CI/CD 단계 추가 | 인증서 갱신 시 자동 해시 추출 + XML 업데이트 스크립트 권장 |

### 5.2 Backlog

| Item | Description |
|------|-------------|
| iOS 피닝 | `react-native-ssl-pinning` 또는 `TrustKit` 도입 (현재 Android만 구현) |
| Socket.IO 피닝 검증 | WebSocket 연결이 `network_security_config`를 준수하는지 실기기 테스트 |

---

## 6. Design Document Updates Needed

- None. CLAUDE.md SEC-M6 섹션이 구현 상태를 정확히 반영함.

---

## 7. Next Steps

- [x] Android network_security_config.xml 생성 (release + debug)
- [x] AndroidManifest.xml에 networkSecurityConfig 속성 추가
- [x] CLAUDE.md SEC-M6 상태 업데이트
- [ ] 프로덕션 인증서 발급 후 SPKI 해시 교체
- [ ] 릴리즈 빌드에서 API 연결 테스트
- [ ] iOS 인증서 피닝 구현 (별도 Task)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-17 | Initial gap analysis | gap-detector |
