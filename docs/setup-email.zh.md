# 登录邮件换成自己的发信服务（Resend + Supabase）

## 为什么要换

现在登录链接是用 Supabase 自带的发信服务发的。它只是给开发测试用的：

- **只发给项目团队成员的邮箱**（也就是你自己）。朋友填自己的邮箱，根本收不到。
- **每小时只能发几封**，而且很容易进垃圾箱。

所以请朋友来测玩伴功能之前，必须先换。

## 整体思路

```
朋友点「发送登录链接」 → Supabase → 通过 SMTP 交给 Resend → Resend 用你的域名发出 → 朋友收件箱
```

你需要三样东西：**一个自己的域名**、**一个 Resend 账号**、**在 Supabase 里填一次 SMTP**。全程大约 30–60 分钟，大部分时间在等 DNS 生效。

---

## 第 1 步：买一个域名（约 $10/年）

发信必须用你自己的域名，`vercel.app` 不行，因为那个域名不归你。

- 推荐在 **Vercel → Domains** 买：买完 DNS 就在 Vercel 里，第 3 步加记录最方便。也可以去 Cloudflare 或 Namecheap 买。
- 名字要短、跟 co-world 相关，比如 `cocoworld.app`、`mycoco.pet`，有哪个就买哪个。
- 顺便把这个域名绑到 Vercel 的 coco 项目上，网址就从 `coco-beryl-gamma.vercel.app` 变成你自己的了。（可选，但录视频更好看。）

## 第 2 步：注册 Resend，添加域名

1. 打开 https://resend.com 注册（免费额度是每月 3000 封、每天 100 封，测试和小范围使用够了）。
2. 左侧 **Domains → Add Domain**。
3. 填一个**子域名**，比如 `mail.cocoworld.app`。用子域名发信，以后这个域名还能做别的用途，互不干扰。
4. Region 选离用户近的（美国用户选 `us-east-1`）。
5. 点 Add 后，Resend 会给你一张 **DNS 记录表**（通常 3 条：一条 MX、两条 TXT，分别对应 SPF 和 DKIM）。先别关这个页面。

## 第 3 步：把 DNS 记录加到域名上

去你买域名的地方（如果在 Vercel 买的，就是 **Vercel → Domains → 你的域名 → DNS Records**），把 Resend 给的每一条照抄进去：

| 类型 | Name（主机名） | Value（值） | 备注 |
|---|---|---|---|
| MX | `send.mail` 之类 | `feedback-smtp.....amazonses.com` | Priority 填 10 |
| TXT | `send.mail` 之类 | `v=spf1 include:amazonses.com ~all` | SPF |
| TXT | `resend._domainkey.mail` 之类 | 一长串 `p=MIGf...` | DKIM |

> 以 Resend 页面上显示的为准，上表只是让你知道大概长什么样。Name 那一栏有的服务商要填完整域名，有的只填前缀；如果它自动在后面加了你的域名，就只填前缀。

可选但推荐：再加一条 DMARC：`TXT`，Name 填 `_dmarc`，Value 填 `v=DMARC1; p=none;`。这样更不容易进垃圾箱。

加完回到 Resend，点 **Verify DNS Records**。几分钟到一小时内会变成绿色的 **Verified**。

## 第 4 步：在 Resend 建一个 API Key

**API Keys → Create API Key**：

- Name 填 `supabase-smtp`
- Permission 选 **Sending access**
- Domain 选刚才验证好的那个

复制这个 key（`re_` 开头，**只显示一次**）。它就是 SMTP 的密码。这一步要你自己操作，别把 key 发到对话里。

## 第 5 步：在 Supabase 里打开自定义 SMTP

Supabase 控制台 → 你的 coco 项目 → **Authentication → Emails → SMTP Settings**（旧界面在 Project Settings → Authentication 里）。打开 **Enable Custom SMTP**，然后填：

| 字段 | 填什么 |
|---|---|
| Sender email | `hello@mail.cocoworld.app`（必须是你验证过的那个域名） |
| Sender name | `coco` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | 第 4 步那个 `re_` 开头的 key |

保存。

> 省事的办法：Resend 后台有 **Integrations → Supabase**，授权后会自动帮你填好这一页。两种方式选一个就行。

## 第 6 步：调整发信频率上限

换了自己的 SMTP 后，Supabase 默认每小时只发 30 封登录邮件。到 **Authentication → Rate Limits** 看一下，小范围测试 30 就够了；以后人多再调高。

## 第 7 步：改邮件模板（可选，建议做）

**Authentication → Emails → Templates → Magic Link**，把默认的英文模板换成 coco 的口吻，比如：

```
Subject: Your way back into your co-world

<p>Tap to sign in to coco:</p>
<p><a href="{{ .ConfirmationURL }}">Open my co-world</a></p>
<p>If you didn't ask for this, you can ignore this email.</p>
```

`{{ .ConfirmationURL }}` 这一段一定要保留，那就是登录链接。**Confirm signup** 模板也照样改一份。

## 第 8 步：如果换了网址，同步改两个地方

如果第 1 步把新域名绑到了 Vercel 上：

- Supabase → **Authentication → URL Configuration**
  - **Site URL** 改成 `https://你的新域名`
  - **Redirect URLs** 加上 `https://你的新域名/**`（旧的 vercel.app 那条先留着）
- 代码里不用改：登录页用的是当前网址（`location.origin`）拼回调地址。

## 第 9 步：测一下

1. 打开登录页，用一个**不是你自己的**邮箱（比如另一个 Gmail、QQ 邮箱）发送登录链接。
2. 应该一分钟内收到，发件人显示 `coco <hello@mail...>`。
3. 收不到的话依次查：
   - Resend → **Emails**：有没有这封、状态是不是 Delivered
   - 收件人的垃圾箱
   - Supabase → **Logs → Auth**：有没有 SMTP 报错（大多是密码填错，或者 Sender email 不是验证过的域名）

全部通过后跟我说一声，我会把 CONCEPT.md「Next」里的这一项划掉。

---

## 哪些步骤你做、哪些我能做

| 步骤 | 谁来做 |
|---|---|
| 买域名、注册 Resend、创建 API Key、在 Supabase 填密码 | **你**（涉及付款和密钥，我不能代填） |
| 对照 Resend 页面核对 DNS 记录有没有抄错 | 截图给我，我帮你看 |
| 写邮件模板文案、改 URL 配置、测试后查日志 | 我可以帮你 |
