# Beatpak GitHub SSH 설정

현재 기본 SSH 키(`~/.ssh/id_ed25519`)는 **SooMinPark-aswemake** 계정에 등록되어 있습니다.  
**Beatpak/Mohagee** push를 위해 Beatpak 전용 키를 추가합니다.

## 1. Beatpak용 SSH 키 생성

터미널에서 실행 (이메일은 Beatpak GitHub에 쓰는 주소로):

```bash
ssh-keygen -t ed25519 -C "beatpak-github" -f ~/.ssh/id_ed25519_beatpak
```

엔터로 passphrase 비우거나, 원하면 비밀번호 설정.

## 2. 공개키를 Beatpak GitHub에 등록

```bash
pbcopy < ~/.ssh/id_ed25519_beatpak.pub
```

1. [Beatpak GitHub](https://github.com/settings/keys) 로그인
2. **SSH and GPG keys** → **New SSH key**
3. 붙여넣기 → 저장

## 3. SSH config 추가

`~/.ssh/config` 파일에 아래를 **추가** (기존 내용은 유지):

```
# Beatpak
Host github.com-beatpak
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_beatpak
  IdentitiesOnly yes

# 기본 (SooMinPark-aswemake 등)
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
```

## 4. 연결 확인

```bash
ssh -T git@github.com-beatpak
```

`Hi Beatpak!` 이 나오면 성공.

## 5. 이 프로젝트 remote 변경 후 push

```bash
cd /Users/parksoomin/random_date
git remote set-url origin git@github.com-beatpak:Beatpak/Mohagee.git
git push -u origin main
```

## 참고

- 다른 Beatpak 레포도 `git@github.com-beatpak:Beatpak/레포이름.git` 형식 사용
- SooMinPark-aswemake 레포는 기존처럼 `git@github.com:...` 사용
