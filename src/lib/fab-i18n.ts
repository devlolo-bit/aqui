/**
 * The MINIMAL i18n of the platform's READY-MADE PIECES (the fab-client). The generated app has its text in the TARGET language (the AI
 * generates it that way), but the READY-MADE components (ChangePassword/AcceptInvite/PaymentMethods/RequirePlan + ui/*) carried
 * hardcoded PT. Here live ONLY the keys those pieces use, in the 5 languages the platform supports
 * (en/pt-BR/es/de/fr). English is the DEFAULT (an English-first platform) and the fallback for any missing key/language.
 *
 * The locale arrives through `<FabProvider locale="…">` (the AI sets it by the target language). The pieces accept OVERRIDE props so the
 * app can customize a specific text without depending on the dictionary. Usage: `t(locale, "cp.save")`.
 */
export type FabLocale = "en" | "pt-BR" | "es" | "de" | "fr";
export const FAB_LOCALES: FabLocale[] = ["en", "pt-BR", "es", "de", "fr"];

// the keys the ready-made pieces use (a prefix per piece): cp=ChangePassword, ai=AcceptInvite, pm=PaymentMethods,
// rp=RequirePlan, ui=the ui/* components (loading-button/image-upload).
export type FabI18nKey =
  | "push.enable" | "push.disable"
  // ip=InstallPrompt (the PWA "add to home screen" banner): it shipped English-only into apps of every language
  | "ip.title" | "ip.hint" | "ip.ios" | "ip.cta"
  | "og.enterCode" | "og.joinCode" | "og.inviteCode" | "og.inviteCodeSub" | "og.copy" | "og.copied" | "og.pairTitle" | "og.pairSubtitle" | "og.pairCreate" | "og.pairJoin" | "og.pairNamePh" | "og.pairCreateCta" | "og.pairJoinCta" | "og.pairError"
  | "cp.titleMust" | "cp.titleChange" | "cp.subMust" | "cp.subChange"
  | "cp.current" | "cp.new" | "cp.save" | "cp.saving" | "cp.updated" | "cp.error"
  | "ai.title" | "ai.subtitle" | "ai.invalid" | "ai.name" | "ai.password" | "ai.submit" | "ai.submitting" | "ai.error"
  | "pm.loading" | "pm.noConfig" | "pm.empty" | "pm.add" | "pm.remove" | "pm.save" | "pm.saving" | "pm.cancel"
  | "pm.errAdd" | "pm.errCardNotLoaded" | "pm.errNoGateway" | "pm.errCardInvalid" | "pm.errSaveFailed"
  | "pm.card" | "pm.numberPh" | "pm.holderPh" | "pm.mmPh" | "pm.yyyyPh" | "pm.cvvPh" | "pm.docPh"
  | "pm.taxIdPh" | "pm.errTaxId"
  | "pm.phonePh" | "pm.zipPh" | "pm.streetPh" | "pm.addrNumberPh" | "pm.complementPh" | "pm.districtPh" | "pm.cityPh" | "pm.statePh"
  | "pm.errPhone" | "pm.errAddress" | "pm.errEmail" | "pm.billingTitle"
  | "rp.title" | "rp.subtitle" | "rp.cta"
  | "ui.save" | "ui.remove" | "auth.backHome" | "auth.continueWith"
  // a social login that came back FAILED (`#fab_oauth_error=<code>`, see fab-client `consumeOAuthError`)
  | "auth.oauthCancelled" | "auth.oauthRefused" | "auth.oauthUnavailable" | "auth.oauthFailed"
  // rte = the rich-text EDITOR toolbar. It shipped with its labels hardcoded in Portuguese, which is exactly
  // what this dictionary exists to remove — an English app showed "Título" and "Imagem" over the text box.
  | "rte.bold" | "rte.italic" | "rte.heading" | "rte.list" | "rte.image" | "rte.placeholder"
  | "ui.more" | "ui.menu" | "ui.back"
  | "ui.close" | "ui.confirm" | "ui.cancel" | "ui.select" | "ui.search" | "ui.notFound"
  | "ui.pickDate" | "ui.searchIcon" | "ui.searchCountry" | "ui.pagination" | "ui.addItem"
  // The PAGINATION LABELS. `ui.pagination` existed and named only the invisible aria-label, while the visible
  // text of the component was hardcoded Portuguese, which made the file LOOK internationalised. `<DataTable>`
  // mounts that pagination on its own past the first page, so every non-Portuguese app shipped with it.
  | "ui.page" | "ui.of" | "ui.prev" | "ui.next"
  // <ScrollRow>'s arrow buttons: an icon alone, so the label is the only thing a screen reader announces.
  | "ui.scrollBack" | "ui.scrollForward"
  // vp=VideoPlayer
  | "vp.play" | "vp.playPause" | "vp.back10" | "vp.fwd10" | "vp.mute" | "vp.speed" | "vp.quality" | "vp.auto"
  | "vp.captions" | "vp.fullscreen" | "vp.progress" | "vp.playing" | "vp.paused"
  | "vp.resumeTitle" | "vp.resumeAt" | "vp.resume" | "vp.fromStart"
  | "vp.expiredTitle" | "vp.expiredBody" | "vp.reload" | "vp.errorTitle" | "vp.errorBody" | "vp.retry"
  | "vp.goneTitle" | "vp.goneBody"
  // ch=Chat
  | "ch.conversations" | "ch.conversation" | "ch.online" | "ch.placeholder" | "ch.send" | "ch.attach" | "ch.back"
  | "ch.empty" | "ch.emptySub" | "ch.threadEmpty" | "ch.threadEmptySub" | "ch.notSent" | "ch.retry" | "ch.loadError"
  // bk=SlotPicker (booking)
  | "bk.stepDate" | "bk.stepTime" | "bk.stepConfirm" | "bk.month" | "bk.week" | "bk.times" | "bk.chooseTime"
  | "bk.total" | "bk.confirm" | "bk.confirming" | "bk.noAvail" | "bk.noAvailSub" | "bk.done" | "bk.min" | "bk.prev" | "bk.next"
  // fd=Feed
  | "fd.placeholder" | "fd.addImage" | "fd.publish" | "fd.empty" | "fd.emptySub" | "fd.like" | "fd.comment"
  | "fd.noComments" | "fd.commentPh" | "fd.send" | "fd.loadMore"
  // rv=Rating (reviews)
  | "rv.reviews" | "rv.title" | "rv.sub" | "rv.placeholder" | "rv.submit" | "rv.submitting" | "rv.helpful"
  | "rv.empty" | "rv.emptySub" | "rv.thanks" | "rv.loginToReview"
  // cx=Chart
  | "cx.noData" | "cx.noDataSub" | "cx.loadError" | "cx.retry" | "cx.total"
  // og=Orgs (OrgSwitcher + Members)
  | "og.members" | "og.pending" | "og.invite" | "og.inviteMember" | "og.inviteSub" | "og.email" | "og.role"
  | "og.cancel" | "og.send" | "og.createOrg" | "og.newOrg" | "og.remove" | "og.empty" | "og.emptySub" | "og.you"
  | "og.active" | "og.pendingStatus" | "og.inactive" | "og.owner" | "og.admin" | "og.editor" | "og.viewer"
  // cv=CSV (import/export)
  | "cv.stepUpload" | "cv.stepMap" | "cv.stepPreview" | "cv.stepConfirm" | "cv.upload" | "cv.uploadSub"
  | "cv.invalidFile" | "cv.invalidFileSub" | "cv.mapTitle" | "cv.mapSub" | "cv.ignore" | "cv.preview"
  | "cv.incompleteMap" | "cv.import" | "cv.importing" | "cv.imported" | "cv.withError" | "cv.line"
  | "cv.chooseFields" | "cv.download" | "cv.exporting"
  // dt=DocTemplate (PDF)
  | "dt.print" | "dt.download" | "dt.receiptTitle" | "dt.no" | "dt.receivedFrom" | "dt.total" | "dt.certTitle"
  | "dt.awardedTo" | "dt.director" | "dt.seal" | "dt.date" | "dt.report"
  // qr=QRCode/QRScanner
  | "qr.download" | "qr.share" | "qr.scanHint" | "qr.notSupported" | "qr.cameraError" | "qr.scanned" | "qr.invalid"
  // ax=Auth extra (TwoFactor + MagicLink)
  | "ax.scanTitle" | "ax.scanSub" | "ax.orKey" | "ax.enterCode" | "ax.enterCodeSub" | "ax.verify" | "ax.verifying"
  | "ax.invalidCode" | "ax.magicSent" | "ax.magicCheck" | "ax.magicTap" | "ax.magicExpires" | "ax.resend" | "ax.resendIn"
  // qt=Quota (freemium)
  | "qt.title" | "qt.subtitle" | "qt.cta"
  // sg = SubscribeGate: what a screen that SELLS shows when this app may not sell from where it runs
  // (inside the store shell with no store billing). It names the state and stops — no price, no link.
  | "sg.title" | "sg.body"
  // pd=PdfReader
  | "pd.prev" | "pd.next" | "pd.page" | "pd.of" | "pd.zoomIn" | "pd.zoomOut" | "pd.bookmark" | "pd.loadError"
  // ag=AgendaBoard (booking provider side)
  | "ag.today" | "ag.prev" | "ag.next" | "ag.block" | "ag.pickSlot" | "ag.noSlots" | "ag.cancel" | "ag.noBookings"
  | "ag.confirm" | "ag.reschedule" | "ag.confirmed" | "ag.pending" | "ag.canceled" | "ag.completed" | "ag.blocked"
  | "av.title" | "av.subtitle" | "av.add" | "av.addTitle" | "av.editTitle" | "av.edit" | "av.remove" | "av.empty" | "av.emptySub" | "av.day" | "av.start" | "av.end" | "av.save" | "av.saving" | "av.cancel" | "av.errRange" | "av.errSave";

type Dict = Record<FabI18nKey, string>;

const en: Dict = {
  "push.enable": "Enable notifications", "push.disable": "Disable notifications",
  "ip.title": "Install this app", "ip.hint": "Add it to your home screen to open it like an app.", "ip.ios": "Tap Share, then \u201CAdd to Home Screen\u201D.", "ip.cta": "Install",
  "og.enterCode": "Enter code", "og.joinCode": "Join with a code", "og.inviteCode": "Invite code", "og.inviteCodeSub": "Share this code so your partner can join.", "og.copy": "Copy", "og.copied": "Copied!", "og.pairTitle": "Connect the two of you", "og.pairSubtitle": "Create your shared space or join with a code.", "og.pairCreate": "Create", "og.pairJoin": "Join", "og.pairNamePh": "Name your space", "og.pairCreateCta": "Create space", "og.pairJoinCta": "Join space", "og.pairError": "Couldn’t do that — check the code.",
  "cp.titleMust": "Set your password", "cp.titleChange": "Change password",
  "cp.subMust": "For your security, choose a new password to continue.",
  "cp.subChange": "Choose a new password for your account.",
  "cp.current": "Current password", "cp.new": "New password", "cp.save": "Save new password",
  "cp.saving": "Saving…", "cp.updated": "Password updated.", "cp.error": "couldn’t change the password",
  "ai.title": "Accept invite", "ai.subtitle": "Set your name and a password to sign in.",
  "ai.invalid": "Invalid or expired invite — ask the administrator for a new one.",
  "ai.name": "Your name", "ai.password": "Create a password", "ai.submit": "Accept & sign in",
  "ai.submitting": "Signing in…", "ai.error": "couldn’t accept the invite",
  "pm.loading": "Loading…", "pm.noConfig": "Payments not configured.", "pm.empty": "No card saved.",
  "pm.add": "+ Add card", "pm.remove": "Remove", "pm.save": "Save card", "pm.saving": "Saving…",
  "pm.cancel": "Cancel", "pm.errAdd": "error adding card", "pm.errCardNotLoaded": "card not loaded",
  "pm.errNoGateway": "gateway not configured", "pm.errCardInvalid": "invalid card", "pm.taxIdPh": "Cardholder tax ID (CPF or CNPJ)", "pm.errTaxId": "enter a valid CPF or CNPJ", "pm.phonePh": "Mobile with area code", "pm.zipPh": "ZIP code (CEP)", "pm.streetPh": "Street", "pm.addrNumberPh": "Number", "pm.complementPh": "Apt, suite (optional)", "pm.districtPh": "Neighborhood", "pm.cityPh": "City", "pm.statePh": "State", "pm.errPhone": "enter a phone with its area code", "pm.errAddress": "fill in ZIP code, street, number, neighborhood, city and state", "pm.errEmail": "your account has no e-mail, and the payment provider requires one", "pm.billingTitle": "Complete your billing details",
  "pm.errSaveFailed": "failed to save the card", "pm.card": "card",
  "pm.numberPh": "Card number", "pm.holderPh": "Name on card", "pm.mmPh": "MM", "pm.yyyyPh": "YYYY", "pm.cvvPh": "CVV", "pm.docPh": "Tax ID (CPF)",
  "rp.title": "Premium feature", "rp.subtitle": "Subscribe to unlock this content.", "rp.cta": "See plans",
  "ui.save": "Save", "ui.page": "Page", "ui.of": "of", "ui.prev": "Previous", "ui.next": "Next", "ui.scrollBack": "Scroll back", "ui.scrollForward": "Scroll forward",
  "ui.pagination": "Pagination", "ui.addItem": "Add…", "ui.remove": "Remove",
  "rte.bold": "Bold", "rte.italic": "Italic", "rte.heading": "Heading", "rte.list": "List", "rte.image": "Image", "rte.placeholder": "Write…",
  "ui.more": "More", "ui.menu": "Menu", "ui.back": "Back", "ui.close": "Close", "ui.confirm": "Confirm", "ui.cancel": "Cancel", "ui.select": "Select…",
  "ui.search": "Search…", "ui.notFound": "Nothing found.", "ui.pickDate": "Pick a date",
  "ui.searchIcon": "Search icon…", "ui.searchCountry": "Search country…",
  "auth.backHome": "Home", "auth.continueWith": "Continue with {p}", "auth.oauthCancelled": "Sign-in was cancelled.", "auth.oauthRefused": "This account can't sign in to this app.", "auth.oauthUnavailable": "This sign-in option isn't available right now.", "auth.oauthFailed": "Sign-in didn't complete. Please try again.",
  "vp.play": "Play",
  "vp.playPause": "Play or pause",
  "vp.back10": "Back 10 seconds",
  "vp.fwd10": "Forward 10 seconds",
  "vp.mute": "Mute",
  "vp.speed": "Playback speed",
  "vp.quality": "Quality",
  "vp.auto": "Auto",
  "vp.captions": "Captions",
  "vp.fullscreen": "Fullscreen",
  "vp.progress": "Video progress",
  "vp.playing": "Playing",
  "vp.paused": "Paused",
  "vp.resumeTitle": "Continue where you left off?",
  "vp.resumeAt": "You were at {time}",
  "vp.resume": "Continue",
  "vp.fromStart": "From the start",
  "vp.expiredTitle": "Your session expired",
  "vp.expiredBody": "The playback link is valid for 2h.",
  "vp.reload": "Reload video",
  "vp.errorTitle": "We could not load this video",
  "vp.errorBody": "Looks like a connection problem. Your progress is saved.",
  "vp.retry": "Try again",
  "vp.goneTitle": "This video is no longer available",
  "vp.goneBody": "It may have been removed.",
  "ch.conversations": "Conversations", "ch.conversation": "Conversation", "ch.online": "online now",
  "ch.placeholder": "Write a message…", "ch.send": "Send", "ch.attach": "Attach", "ch.back": "Back",
  "ch.empty": "No conversations yet", "ch.emptySub": "When someone messages you, it shows up here.",
  "ch.threadEmpty": "Say hello 👋", "ch.threadEmptySub": "Be the first to send a message.",
  "ch.notSent": "Not sent", "ch.retry": "Retry", "ch.loadError": "Couldn’t load messages",
  "bk.stepDate": "Date", "bk.stepTime": "Time", "bk.stepConfirm": "Confirm", "bk.month": "Month", "bk.week": "Week",
  "bk.times": "Times", "bk.chooseTime": "choose a time above", "bk.total": "Total", "bk.confirm": "Confirm booking",
  "bk.confirming": "Confirming…", "bk.noAvail": "No times available", "bk.noAvailSub": "Try another day.",
  "bk.done": "Booking confirmed!", "bk.min": "min", "bk.prev": "Previous month", "bk.next": "Next month",
  "fd.placeholder": "Share something…", "fd.addImage": "Add image", "fd.publish": "Post", "fd.empty": "No posts yet",
  "fd.emptySub": "Be the first to post.", "fd.like": "Like", "fd.comment": "Comment", "fd.noComments": "No comments yet",
  "fd.commentPh": "Write a comment…", "fd.send": "Send", "fd.loadMore": "Load more",
  "rv.reviews": "reviews", "rv.title": "How was your experience?", "rv.sub": "Tap the stars to rate.", "rv.placeholder": "Tell us more… (optional)",
  "rv.submit": "Submit review", "rv.submitting": "Sending…", "rv.helpful": "Helpful", "rv.empty": "No reviews yet", "rv.emptySub": "Be the first to review.", "rv.thanks": "Thanks for your review!", "rv.loginToReview": "Log in to leave a review.",
  "cx.noData": "No data in range", "cx.noDataSub": "Adjust the date range.", "cx.loadError": "Couldn’t load", "cx.retry": "Try again", "cx.total": "total",
  "og.members": "Members", "og.pending": "pending", "og.invite": "Invite", "og.inviteMember": "Invite member", "og.inviteSub": "We’ll send an email invitation.", "og.email": "Email", "og.role": "Role",
  "og.cancel": "Cancel", "og.send": "Send invite", "og.createOrg": "Create organization", "og.newOrg": "Organization name", "og.remove": "Remove", "og.empty": "Invite your team", "og.emptySub": "You’re the only one here.", "og.you": "You",
  "og.active": "Active", "og.pendingStatus": "Pending", "og.inactive": "Inactive", "og.owner": "Owner", "og.admin": "Admin", "og.editor": "Editor", "og.viewer": "Viewer",
  "cv.stepUpload": "Upload", "cv.stepMap": "Map", "cv.stepPreview": "Preview", "cv.stepConfirm": "Confirm", "cv.upload": "Choose a .csv file", "cv.uploadSub": "Header in the first row · max 10 MB",
  "cv.invalidFile": "Invalid file", "cv.invalidFileSub": "Use a .csv with a header row.", "cv.mapTitle": "Map columns", "cv.mapSub": "We auto-detected — review if needed.", "cv.ignore": "Ignore column", "cv.preview": "Preview",
  "cv.incompleteMap": "Required field not mapped:", "cv.import": "Import", "cv.importing": "Importing…", "cv.imported": "imported", "cv.withError": "with error", "cv.line": "Row",
  "cv.chooseFields": "Export · choose fields", "cv.download": "Download CSV", "cv.exporting": "Exporting…",
  "dt.print": "Print", "dt.download": "Download PDF", "dt.receiptTitle": "RECEIPT", "dt.no": "No.", "dt.receivedFrom": "Received from", "dt.total": "Total", "dt.certTitle": "CERTIFICATE OF COMPLETION",
  "dt.awardedTo": "Awarded to", "dt.director": "Director", "dt.seal": "SEAL", "dt.date": "Date", "dt.report": "Report",
  "qr.download": "Download", "qr.share": "Share", "qr.scanHint": "Point at the QR", "qr.notSupported": "Scanning isn’t supported on this device", "qr.cameraError": "Couldn’t access the camera", "qr.scanned": "Scanned", "qr.invalid": "Invalid code",
  "ax.scanTitle": "Scan in your authenticator app", "ax.scanSub": "Google Authenticator, Authy, 1Password…", "ax.orKey": "Or enter the key:", "ax.enterCode": "Enter the code", "ax.enterCodeSub": "6 digits from your authenticator app.", "ax.verify": "Verify", "ax.verifying": "Verifying…",
  "ax.invalidCode": "Invalid code", "ax.magicSent": "We sent a link 📩", "ax.magicCheck": "Check", "ax.magicTap": "and tap the link to sign in.", "ax.magicExpires": "It expires in {n} minutes.", "ax.resend": "Resend link", "ax.resendIn": "Resend in",
  "qt.title": "Free limit reached", "qt.subtitle": "Upgrade to premium for unlimited access.", "qt.cta": "See plans",
  "sg.title": "Premium not active", "sg.body": "This account does not have Premium access.",
  "pd.prev": "Previous page", "pd.next": "Next page", "pd.page": "Page", "pd.of": "of", "pd.zoomIn": "Zoom in", "pd.zoomOut": "Zoom out", "pd.bookmark": "Bookmark page", "pd.loadError": "Couldn’t load the PDF",
  "ag.today": "Today", "ag.prev": "Previous week", "ag.next": "Next week", "ag.block": "Block", "ag.pickSlot": "Pick a time", "ag.noSlots": "No free times", "ag.cancel": "Cancel", "ag.noBookings": "No bookings this day",
  "ag.confirm": "Confirm", "ag.reschedule": "Reschedule", "ag.confirmed": "Confirmed", "ag.pending": "Pending", "ag.canceled": "Canceled", "ag.completed": "Completed", "ag.blocked": "Blocked",
  "av.title": "Availability", "av.subtitle": "Your weekly working hours", "av.add": "Add", "av.addTitle": "Add availability", "av.editTitle": "Edit availability", "av.edit": "Edit", "av.remove": "Remove", "av.empty": "No availability set", "av.emptySub": "Add your working hours so clients can book.", "av.day": "Day", "av.start": "Start", "av.end": "End", "av.save": "Save", "av.saving": "Saving…", "av.cancel": "Cancel", "av.errRange": "End must be after start.", "av.errSave": "Couldn't save. Try again.",
};

const ptBR: Dict = {
  "push.enable": "Ativar notificações", "push.disable": "Desativar notificações",
  "ip.title": "Instale este app", "ip.hint": "Adicione à tela inicial para abrir como um aplicativo.", "ip.ios": "Toque em Compartilhar e depois em \u201CAdicionar à Tela de Início\u201D.", "ip.cta": "Instalar",
  "og.enterCode": "Digite o código", "og.joinCode": "Entrar com código", "og.inviteCode": "Código de convite", "og.inviteCodeSub": "Compartilhe este código para o seu par entrar.", "og.copy": "Copiar", "og.copied": "Copiado!", "og.pairTitle": "Conectem vocês dois", "og.pairSubtitle": "Crie o espaço de vocês ou entre com um código.", "og.pairCreate": "Criar", "og.pairJoin": "Entrar", "og.pairNamePh": "Dê um nome ao espaço", "og.pairCreateCta": "Criar espaço", "og.pairJoinCta": "Entrar no espaço", "og.pairError": "Não deu certo — confira o código.",
  "cp.titleMust": "Defina sua senha", "cp.titleChange": "Trocar senha",
  "cp.subMust": "Por segurança, escolha uma nova senha para continuar.",
  "cp.subChange": "Escolha uma nova senha para a sua conta.",
  "cp.current": "Senha atual", "cp.new": "Nova senha", "cp.save": "Salvar nova senha",
  "cp.saving": "Salvando…", "cp.updated": "Senha atualizada.", "cp.error": "não foi possível trocar a senha",
  "ai.title": "Aceitar convite", "ai.subtitle": "Defina seu nome e uma senha para entrar.",
  "ai.invalid": "Convite inválido ou expirado — peça um novo ao administrador.",
  "ai.name": "Seu nome", "ai.password": "Crie uma senha", "ai.submit": "Aceitar e entrar",
  "ai.submitting": "Entrando…", "ai.error": "não foi possível aceitar o convite",
  "pm.loading": "Carregando…", "pm.noConfig": "Pagamentos não configurado.", "pm.empty": "Nenhum cartão salvo.",
  "pm.add": "+ Adicionar cartão", "pm.remove": "Remover", "pm.save": "Salvar cartão", "pm.saving": "Salvando…",
  "pm.cancel": "Cancelar", "pm.errAdd": "erro ao adicionar", "pm.errCardNotLoaded": "cartão não carregado",
  "pm.errNoGateway": "gateway não configurado", "pm.errCardInvalid": "cartão inválido", "pm.taxIdPh": "CPF ou CNPJ do titular", "pm.errTaxId": "informe um CPF ou CNPJ válido", "pm.phonePh": "Celular com DDD", "pm.zipPh": "CEP", "pm.streetPh": "Rua", "pm.addrNumberPh": "Número", "pm.complementPh": "Complemento (opcional)", "pm.districtPh": "Bairro", "pm.cityPh": "Cidade", "pm.statePh": "UF", "pm.errPhone": "informe o telefone com DDD", "pm.errAddress": "preencha CEP, rua, número, bairro, cidade e UF", "pm.errEmail": "sua conta não tem e-mail, e o meio de pagamento exige um", "pm.billingTitle": "Complete seus dados de cobrança",
  "pm.errSaveFailed": "falha ao salvar o cartão", "pm.card": "cartão",
  "pm.numberPh": "Número do cartão", "pm.holderPh": "Nome impresso", "pm.mmPh": "MM", "pm.yyyyPh": "AAAA", "pm.cvvPh": "CVV", "pm.docPh": "CPF",
  "rp.title": "Recurso premium", "rp.subtitle": "Assine para desbloquear este conteúdo.", "rp.cta": "Ver planos",
  "ui.save": "Salvar", "ui.page": "Página", "ui.of": "de", "ui.prev": "Anterior", "ui.next": "Próxima", "ui.scrollBack": "Rolar para trás", "ui.scrollForward": "Rolar para a frente",
  "ui.pagination": "Paginação", "ui.addItem": "Adicionar…", "ui.remove": "Remover",
  "rte.bold": "Negrito", "rte.italic": "Itálico", "rte.heading": "Título", "rte.list": "Lista", "rte.image": "Imagem", "rte.placeholder": "Escreva…",
  "ui.more": "Mais", "ui.menu": "Menu", "ui.back": "Voltar", "ui.close": "Fechar", "ui.confirm": "Confirmar", "ui.cancel": "Cancelar", "ui.select": "Selecione…",
  "ui.search": "Buscar…", "ui.notFound": "Nada encontrado.", "ui.pickDate": "Selecione a data",
  "ui.searchIcon": "Buscar ícone…", "ui.searchCountry": "Buscar país…",
  "auth.backHome": "Início", "auth.continueWith": "Continuar com {p}", "auth.oauthCancelled": "O login foi cancelado.", "auth.oauthRefused": "Esta conta não pode entrar neste app.", "auth.oauthUnavailable": "Esta forma de login não está disponível agora.", "auth.oauthFailed": "O login não foi concluído. Tente de novo.",
  "vp.play": "Reproduzir",
  "vp.playPause": "Reproduzir ou pausar",
  "vp.back10": "Voltar 10 segundos",
  "vp.fwd10": "Avançar 10 segundos",
  "vp.mute": "Mudo",
  "vp.speed": "Velocidade de reprodução",
  "vp.quality": "Qualidade",
  "vp.auto": "Auto",
  "vp.captions": "Legendas",
  "vp.fullscreen": "Tela cheia",
  "vp.progress": "Progresso do vídeo",
  "vp.playing": "Reproduzindo",
  "vp.paused": "Pausado",
  "vp.resumeTitle": "Continuar de onde parou?",
  "vp.resumeAt": "Você estava em {time}",
  "vp.resume": "Continuar",
  "vp.fromStart": "Do início",
  "vp.expiredTitle": "Sua sessão expirou",
  "vp.expiredBody": "O link de reprodução vale por 2h.",
  "vp.reload": "Recarregar vídeo",
  "vp.errorTitle": "Não conseguimos carregar este vídeo",
  "vp.errorBody": "Parece um problema de conexão. Seu progresso está salvo.",
  "vp.retry": "Tentar de novo",
  "vp.goneTitle": "Este vídeo não está mais disponível",
  "vp.goneBody": "Ele pode ter sido removido.",
  "ch.conversations": "Conversas", "ch.conversation": "Conversa", "ch.online": "online agora",
  "ch.placeholder": "Escreva uma mensagem…", "ch.send": "Enviar", "ch.attach": "Anexar", "ch.back": "Voltar",
  "ch.empty": "Nenhuma conversa ainda", "ch.emptySub": "Quando alguém te chamar, aparece aqui.",
  "ch.threadEmpty": "Diga olá 👋", "ch.threadEmptySub": "Seja o primeiro a enviar uma mensagem.",
  "ch.notSent": "Não enviada", "ch.retry": "Reenviar", "ch.loadError": "Não foi possível carregar as mensagens",
  "bk.stepDate": "Data", "bk.stepTime": "Horário", "bk.stepConfirm": "Confirmar", "bk.month": "Mês", "bk.week": "Semana",
  "bk.times": "Horários", "bk.chooseTime": "escolha um horário acima", "bk.total": "Total", "bk.confirm": "Confirmar agendamento",
  "bk.confirming": "Confirmando…", "bk.noAvail": "Nenhum horário livre", "bk.noAvailSub": "Tente outro dia.",
  "bk.done": "Agendamento confirmado!", "bk.min": "min", "bk.prev": "Mês anterior", "bk.next": "Próximo mês",
  "fd.placeholder": "Compartilhe uma novidade…", "fd.addImage": "Adicionar imagem", "fd.publish": "Publicar", "fd.empty": "Ainda sem publicações",
  "fd.emptySub": "Seja o primeiro a postar.", "fd.like": "Curtir", "fd.comment": "Comentar", "fd.noComments": "Nenhum comentário ainda",
  "fd.commentPh": "Escreva um comentário…", "fd.send": "Enviar", "fd.loadMore": "Carregar mais",
  "rv.reviews": "avaliações", "rv.title": "Como foi sua experiência?", "rv.sub": "Toque nas estrelas para avaliar.", "rv.placeholder": "Conte mais… (opcional)",
  "rv.submit": "Enviar avaliação", "rv.submitting": "Enviando…", "rv.helpful": "Útil", "rv.empty": "Ainda sem avaliações", "rv.emptySub": "Seja o primeiro a avaliar.", "rv.thanks": "Obrigado pela avaliação!", "rv.loginToReview": "Faça login para avaliar.",
  "cx.noData": "Sem dados no período", "cx.noDataSub": "Ajuste o intervalo de datas.", "cx.loadError": "Não foi possível carregar", "cx.retry": "Tentar de novo", "cx.total": "total",
  "og.members": "Membros", "og.pending": "pendente(s)", "og.invite": "Convidar", "og.inviteMember": "Convidar membro", "og.inviteSub": "Enviaremos um convite por e-mail.", "og.email": "E-mail", "og.role": "Função",
  "og.cancel": "Cancelar", "og.send": "Enviar convite", "og.createOrg": "Criar organização", "og.newOrg": "Nome da organização", "og.remove": "Remover", "og.empty": "Convide sua equipe", "og.emptySub": "Você ainda é a única pessoa aqui.", "og.you": "Você",
  "og.active": "Ativo", "og.pendingStatus": "Pendente", "og.inactive": "Inativo", "og.owner": "Dono", "og.admin": "Admin", "og.editor": "Editor", "og.viewer": "Leitor",
  "cv.stepUpload": "Enviar", "cv.stepMap": "Mapear", "cv.stepPreview": "Pré-visualizar", "cv.stepConfirm": "Confirmar", "cv.upload": "Escolha um arquivo .csv", "cv.uploadSub": "Cabeçalho na primeira linha · máx. 10 MB",
  "cv.invalidFile": "Arquivo inválido", "cv.invalidFileSub": "Use um .csv com cabeçalho na primeira linha.", "cv.mapTitle": "Mapear colunas", "cv.mapSub": "Detectamos automaticamente — revise se precisar.", "cv.ignore": "Ignorar coluna", "cv.preview": "Pré-visualização",
  "cv.incompleteMap": "Campo obrigatório não mapeado:", "cv.import": "Importar", "cv.importing": "Importando…", "cv.imported": "importados", "cv.withError": "com erro", "cv.line": "Linha",
  "cv.chooseFields": "Exportar · escolher campos", "cv.download": "Baixar CSV", "cv.exporting": "Exportando…",
  "dt.print": "Imprimir", "dt.download": "Baixar PDF", "dt.receiptTitle": "RECIBO", "dt.no": "Nº", "dt.receivedFrom": "Recebemos de", "dt.total": "Total", "dt.certTitle": "CERTIFICADO DE CONCLUSÃO",
  "dt.awardedTo": "Conferido a", "dt.director": "Diretor", "dt.seal": "SELO", "dt.date": "Data", "dt.report": "Relatório",
  "qr.download": "Baixar", "qr.share": "Compartilhar", "qr.scanHint": "Aponte para o QR", "qr.notSupported": "Leitura não suportada neste dispositivo", "qr.cameraError": "Não foi possível acessar a câmera", "qr.scanned": "Lido", "qr.invalid": "Código inválido",
  "ax.scanTitle": "Escaneie no app autenticador", "ax.scanSub": "Google Authenticator, Authy, 1Password…", "ax.orKey": "Ou digite a chave:", "ax.enterCode": "Digite o código", "ax.enterCodeSub": "6 dígitos do seu app autenticador.", "ax.verify": "Verificar", "ax.verifying": "Verificando…",
  "ax.invalidCode": "Código inválido", "ax.magicSent": "Enviamos um link 📩", "ax.magicCheck": "Verifique", "ax.magicTap": "e toque no link para entrar.", "ax.magicExpires": "Ele expira em {n} minutos.", "ax.resend": "Reenviar link", "ax.resendIn": "Reenviar em",
  "qt.title": "Limite gratuito atingido", "qt.subtitle": "Assine o premium para uso ilimitado.", "qt.cta": "Ver planos",
  "sg.title": "Premium não ativo", "sg.body": "Esta conta não tem acesso Premium.",
  "pd.prev": "Página anterior", "pd.next": "Próxima página", "pd.page": "Página", "pd.of": "de", "pd.zoomIn": "Ampliar", "pd.zoomOut": "Reduzir", "pd.bookmark": "Favoritar página", "pd.loadError": "Não foi possível abrir o PDF",
  "ag.today": "Hoje", "ag.prev": "Semana anterior", "ag.next": "Próxima semana", "ag.block": "Bloquear", "ag.pickSlot": "Escolha um horário", "ag.noSlots": "Sem horários livres", "ag.cancel": "Cancelar", "ag.noBookings": "Nenhuma reserva neste dia",
  "ag.confirm": "Confirmar", "ag.reschedule": "Reagendar", "ag.confirmed": "Confirmado", "ag.pending": "Pendente", "ag.canceled": "Cancelado", "ag.completed": "Concluído", "ag.blocked": "Bloqueado",
  "av.title": "Disponibilidade", "av.subtitle": "Suas horas de atendimento por semana", "av.add": "Adicionar", "av.addTitle": "Adicionar disponibilidade", "av.editTitle": "Editar disponibilidade", "av.edit": "Editar", "av.remove": "Remover", "av.empty": "Nenhuma disponibilidade definida", "av.emptySub": "Adicione seus horários para os clientes agendarem.", "av.day": "Dia", "av.start": "Início", "av.end": "Fim", "av.save": "Salvar", "av.saving": "Salvando…", "av.cancel": "Cancelar", "av.errRange": "O fim deve ser depois do início.", "av.errSave": "Não foi possível salvar. Tente de novo.",
};

const es: Dict = {
  "push.enable": "Activar notificaciones", "push.disable": "Desactivar notificaciones",
  "ip.title": "Instala esta app", "ip.hint": "Añádela a tu pantalla de inicio para abrirla como una app.", "ip.ios": "Toca Compartir y luego \u201CAñadir a pantalla de inicio\u201D.", "ip.cta": "Instalar",
  "og.enterCode": "Ingresa el código", "og.joinCode": "Unirse con código", "og.inviteCode": "Código de invitación", "og.inviteCodeSub": "Comparte este código para que tu pareja se una.", "og.copy": "Copiar", "og.copied": "¡Copiado!", "og.pairTitle": "Conéctense los dos", "og.pairSubtitle": "Crea su espacio o únete con un código.", "og.pairCreate": "Crear", "og.pairJoin": "Unirse", "og.pairNamePh": "Nombra su espacio", "og.pairCreateCta": "Crear espacio", "og.pairJoinCta": "Unirse al espacio", "og.pairError": "No se pudo — revisa el código.",
  "cp.titleMust": "Define tu contraseña", "cp.titleChange": "Cambiar contraseña",
  "cp.subMust": "Por seguridad, elige una nueva contraseña para continuar.",
  "cp.subChange": "Elige una nueva contraseña para tu cuenta.",
  "cp.current": "Contraseña actual", "cp.new": "Nueva contraseña", "cp.save": "Guardar nueva contraseña",
  "cp.saving": "Guardando…", "cp.updated": "Contraseña actualizada.", "cp.error": "no se pudo cambiar la contraseña",
  "ai.title": "Aceptar invitación", "ai.subtitle": "Define tu nombre y una contraseña para entrar.",
  "ai.invalid": "Invitación inválida o caducada — pide una nueva al administrador.",
  "ai.name": "Tu nombre", "ai.password": "Crea una contraseña", "ai.submit": "Aceptar y entrar",
  "ai.submitting": "Entrando…", "ai.error": "no se pudo aceptar la invitación",
  "pm.loading": "Cargando…", "pm.noConfig": "Pagos no configurados.", "pm.empty": "Ninguna tarjeta guardada.",
  "pm.add": "+ Añadir tarjeta", "pm.remove": "Quitar", "pm.save": "Guardar tarjeta", "pm.saving": "Guardando…",
  "pm.cancel": "Cancelar", "pm.errAdd": "error al añadir", "pm.errCardNotLoaded": "tarjeta no cargada",
  "pm.errNoGateway": "pasarela no configurada", "pm.errCardInvalid": "tarjeta inválida", "pm.taxIdPh": "CPF o CNPJ del titular", "pm.errTaxId": "ingresa un CPF o CNPJ válido", "pm.phonePh": "Celular con código de área", "pm.zipPh": "Código postal (CEP)", "pm.streetPh": "Calle", "pm.addrNumberPh": "Número", "pm.complementPh": "Depto. (opcional)", "pm.districtPh": "Barrio", "pm.cityPh": "Ciudad", "pm.statePh": "Estado", "pm.errPhone": "ingresa el teléfono con código de área", "pm.errAddress": "completa código postal, calle, número, barrio, ciudad y estado", "pm.errEmail": "tu cuenta no tiene e-mail, y el medio de pago exige uno", "pm.billingTitle": "Completa tus datos de facturación",
  "pm.errSaveFailed": "no se pudo guardar la tarjeta", "pm.card": "tarjeta",
  "pm.numberPh": "Número de tarjeta", "pm.holderPh": "Nombre en la tarjeta", "pm.mmPh": "MM", "pm.yyyyPh": "AAAA", "pm.cvvPh": "CVV", "pm.docPh": "Documento (CPF)",
  "rp.title": "Función premium", "rp.subtitle": "Suscríbete para desbloquear este contenido.", "rp.cta": "Ver planes",
  "ui.save": "Guardar", "ui.page": "Página", "ui.of": "de", "ui.prev": "Anterior", "ui.next": "Siguiente", "ui.scrollBack": "Desplazar atrás", "ui.scrollForward": "Desplazar adelante",
  "ui.pagination": "Paginación", "ui.addItem": "Añadir…", "ui.remove": "Quitar",
  "rte.bold": "Negrita", "rte.italic": "Cursiva", "rte.heading": "Título", "rte.list": "Lista", "rte.image": "Imagen", "rte.placeholder": "Escribe…",
  "ui.more": "Más", "ui.menu": "Menú", "ui.back": "Atrás", "ui.close": "Cerrar", "ui.confirm": "Confirmar", "ui.cancel": "Cancelar", "ui.select": "Selecciona…",
  "ui.search": "Buscar…", "ui.notFound": "Nada encontrado.", "ui.pickDate": "Elige una fecha",
  "ui.searchIcon": "Buscar icono…", "ui.searchCountry": "Buscar país…",
  "auth.backHome": "Inicio", "auth.continueWith": "Continuar con {p}", "auth.oauthCancelled": "Se canceló el inicio de sesión.", "auth.oauthRefused": "Esta cuenta no puede iniciar sesión en esta app.", "auth.oauthUnavailable": "Esta opción de inicio de sesión no está disponible ahora.", "auth.oauthFailed": "No se completó el inicio de sesión. Inténtalo de nuevo.",
  "vp.play": "Reproducir",
  "vp.playPause": "Reproducir o pausar",
  "vp.back10": "Retroceder 10 segundos",
  "vp.fwd10": "Avanzar 10 segundos",
  "vp.mute": "Silenciar",
  "vp.speed": "Velocidad de reproducción",
  "vp.quality": "Calidad",
  "vp.auto": "Auto",
  "vp.captions": "Subtítulos",
  "vp.fullscreen": "Pantalla completa",
  "vp.progress": "Progreso del video",
  "vp.playing": "Reproduciendo",
  "vp.paused": "En pausa",
  "vp.resumeTitle": "¿Continuar donde lo dejaste?",
  "vp.resumeAt": "Estabas en {time}",
  "vp.resume": "Continuar",
  "vp.fromStart": "Desde el principio",
  "vp.expiredTitle": "Tu sesión ha expirado",
  "vp.expiredBody": "El enlace de reproducción dura 2 h.",
  "vp.reload": "Recargar video",
  "vp.errorTitle": "No pudimos cargar este video",
  "vp.errorBody": "Parece un problema de conexión. Tu progreso está guardado.",
  "vp.retry": "Reintentar",
  "vp.goneTitle": "Este video ya no está disponible",
  "vp.goneBody": "Puede que se haya eliminado.",
  "ch.conversations": "Conversaciones", "ch.conversation": "Conversación", "ch.online": "en línea",
  "ch.placeholder": "Escribe un mensaje…", "ch.send": "Enviar", "ch.attach": "Adjuntar", "ch.back": "Volver",
  "ch.empty": "Aún no hay conversaciones", "ch.emptySub": "Cuando alguien te escriba, aparecerá aquí.",
  "ch.threadEmpty": "Saluda 👋", "ch.threadEmptySub": "Sé el primero en enviar un mensaje.",
  "ch.notSent": "No enviada", "ch.retry": "Reintentar", "ch.loadError": "No se pudieron cargar los mensajes",
  "bk.stepDate": "Fecha", "bk.stepTime": "Hora", "bk.stepConfirm": "Confirmar", "bk.month": "Mes", "bk.week": "Semana",
  "bk.times": "Horarios", "bk.chooseTime": "elige una hora arriba", "bk.total": "Total", "bk.confirm": "Confirmar reserva",
  "bk.confirming": "Confirmando…", "bk.noAvail": "Sin horarios disponibles", "bk.noAvailSub": "Prueba otro día.",
  "bk.done": "¡Reserva confirmada!", "bk.min": "min", "bk.prev": "Mes anterior", "bk.next": "Mes siguiente",
  "fd.placeholder": "Comparte algo…", "fd.addImage": "Añadir imagen", "fd.publish": "Publicar", "fd.empty": "Aún no hay publicaciones",
  "fd.emptySub": "Sé el primero en publicar.", "fd.like": "Me gusta", "fd.comment": "Comentar", "fd.noComments": "Aún no hay comentarios",
  "fd.commentPh": "Escribe un comentario…", "fd.send": "Enviar", "fd.loadMore": "Cargar más",
  "rv.reviews": "reseñas", "rv.title": "¿Cómo fue tu experiencia?", "rv.sub": "Toca las estrellas para valorar.", "rv.placeholder": "Cuéntanos más… (opcional)",
  "rv.submit": "Enviar reseña", "rv.submitting": "Enviando…", "rv.helpful": "Útil", "rv.empty": "Aún no hay reseñas", "rv.emptySub": "Sé el primero en valorar.", "rv.thanks": "¡Gracias por tu reseña!", "rv.loginToReview": "Inicia sesión para dejar una reseña.",
  "cx.noData": "Sin datos en el rango", "cx.noDataSub": "Ajusta el rango de fechas.", "cx.loadError": "No se pudo cargar", "cx.retry": "Reintentar", "cx.total": "total",
  "og.members": "Miembros", "og.pending": "pendiente(s)", "og.invite": "Invitar", "og.inviteMember": "Invitar miembro", "og.inviteSub": "Enviaremos una invitación por correo.", "og.email": "Correo", "og.role": "Rol",
  "og.cancel": "Cancelar", "og.send": "Enviar invitación", "og.createOrg": "Crear organización", "og.newOrg": "Nombre de la organización", "og.remove": "Quitar", "og.empty": "Invita a tu equipo", "og.emptySub": "Eres la única persona aquí.", "og.you": "Tú",
  "og.active": "Activo", "og.pendingStatus": "Pendiente", "og.inactive": "Inactivo", "og.owner": "Dueño", "og.admin": "Admin", "og.editor": "Editor", "og.viewer": "Lector",
  "cv.stepUpload": "Subir", "cv.stepMap": "Mapear", "cv.stepPreview": "Vista previa", "cv.stepConfirm": "Confirmar", "cv.upload": "Elige un archivo .csv", "cv.uploadSub": "Encabezado en la primera fila · máx. 10 MB",
  "cv.invalidFile": "Archivo inválido", "cv.invalidFileSub": "Usa un .csv con encabezado.", "cv.mapTitle": "Mapear columnas", "cv.mapSub": "Detección automática — revisa si hace falta.", "cv.ignore": "Ignorar columna", "cv.preview": "Vista previa",
  "cv.incompleteMap": "Campo obligatorio sin mapear:", "cv.import": "Importar", "cv.importing": "Importando…", "cv.imported": "importados", "cv.withError": "con error", "cv.line": "Fila",
  "cv.chooseFields": "Exportar · elegir campos", "cv.download": "Descargar CSV", "cv.exporting": "Exportando…",
  "dt.print": "Imprimir", "dt.download": "Descargar PDF", "dt.receiptTitle": "RECIBO", "dt.no": "N.º", "dt.receivedFrom": "Recibimos de", "dt.total": "Total", "dt.certTitle": "CERTIFICADO DE FINALIZACIÓN",
  "dt.awardedTo": "Otorgado a", "dt.director": "Director", "dt.seal": "SELLO", "dt.date": "Fecha", "dt.report": "Informe",
  "qr.download": "Descargar", "qr.share": "Compartir", "qr.scanHint": "Apunta al QR", "qr.notSupported": "La lectura no es compatible en este dispositivo", "qr.cameraError": "No se pudo acceder a la cámara", "qr.scanned": "Leído", "qr.invalid": "Código inválido",
  "ax.scanTitle": "Escanea en tu app de autenticación", "ax.scanSub": "Google Authenticator, Authy, 1Password…", "ax.orKey": "O ingresa la clave:", "ax.enterCode": "Ingresa el código", "ax.enterCodeSub": "6 dígitos de tu app de autenticación.", "ax.verify": "Verificar", "ax.verifying": "Verificando…",
  "ax.invalidCode": "Código inválido", "ax.magicSent": "Enviamos un enlace 📩", "ax.magicCheck": "Revisa", "ax.magicTap": "y toca el enlace para entrar.", "ax.magicExpires": "Caduca en {n} minutos.", "ax.resend": "Reenviar enlace", "ax.resendIn": "Reenviar en",
  "qt.title": "Límite gratuito alcanzado", "qt.subtitle": "Suscríbete al premium para uso ilimitado.", "qt.cta": "Ver planes",
  "sg.title": "Premium no activo", "sg.body": "Esta cuenta no tiene acceso Premium.",
  "pd.prev": "Página anterior", "pd.next": "Página siguiente", "pd.page": "Página", "pd.of": "de", "pd.zoomIn": "Ampliar", "pd.zoomOut": "Reducir", "pd.bookmark": "Guardar página", "pd.loadError": "No se pudo abrir el PDF",
  "ag.today": "Hoy", "ag.prev": "Semana anterior", "ag.next": "Semana siguiente", "ag.block": "Bloquear", "ag.pickSlot": "Elige un horario", "ag.noSlots": "Sin horarios libres", "ag.cancel": "Cancelar", "ag.noBookings": "Sin reservas este día",
  "ag.confirm": "Confirmar", "ag.reschedule": "Reprogramar", "ag.confirmed": "Confirmado", "ag.pending": "Pendiente", "ag.canceled": "Cancelado", "ag.completed": "Completado", "ag.blocked": "Bloqueado",
  "av.title": "Disponibilidad", "av.subtitle": "Tus horas de atención por semana", "av.add": "Agregar", "av.addTitle": "Agregar disponibilidad", "av.editTitle": "Editar disponibilidad", "av.edit": "Editar", "av.remove": "Quitar", "av.empty": "Sin disponibilidad configurada", "av.emptySub": "Agrega tus horarios para que los clientes reserven.", "av.day": "Día", "av.start": "Inicio", "av.end": "Fin", "av.save": "Guardar", "av.saving": "Guardando…", "av.cancel": "Cancelar", "av.errRange": "El fin debe ser después del inicio.", "av.errSave": "No se pudo guardar. Inténtalo de nuevo.",
};

const de: Dict = {
  "push.enable": "Benachrichtigungen aktivieren", "push.disable": "Benachrichtigungen deaktivieren",
  "ip.title": "Diese App installieren", "ip.hint": "Füge sie zum Startbildschirm hinzu, um sie wie eine App zu öffnen.", "ip.ios": "Tippe auf Teilen und dann auf \u201EZum Home-Bildschirm\u201C.", "ip.cta": "Installieren",
  "og.enterCode": "Code eingeben", "og.joinCode": "Mit Code beitreten", "og.inviteCode": "Einladungscode", "og.inviteCodeSub": "Teile diesen Code, damit dein Partner beitreten kann.", "og.copy": "Kopieren", "og.copied": "Kopiert!", "og.pairTitle": "Verbindet euch beide", "og.pairSubtitle": "Erstelle euren Raum oder tritt mit einem Code bei.", "og.pairCreate": "Erstellen", "og.pairJoin": "Beitreten", "og.pairNamePh": "Benenne euren Raum", "og.pairCreateCta": "Raum erstellen", "og.pairJoinCta": "Raum beitreten", "og.pairError": "Hat nicht geklappt — prüfe den Code.",
  "cp.titleMust": "Passwort festlegen", "cp.titleChange": "Passwort ändern",
  "cp.subMust": "Wähle aus Sicherheitsgründen ein neues Passwort, um fortzufahren.",
  "cp.subChange": "Wähle ein neues Passwort für dein Konto.",
  "cp.current": "Aktuelles Passwort", "cp.new": "Neues Passwort", "cp.save": "Neues Passwort speichern",
  "cp.saving": "Wird gespeichert…", "cp.updated": "Passwort aktualisiert.", "cp.error": "Passwort konnte nicht geändert werden",
  "ai.title": "Einladung annehmen", "ai.subtitle": "Lege deinen Namen und ein Passwort fest, um dich anzumelden.",
  "ai.invalid": "Ungültige oder abgelaufene Einladung — bitte den Administrator um eine neue.",
  "ai.name": "Dein Name", "ai.password": "Passwort erstellen", "ai.submit": "Annehmen & anmelden",
  "ai.submitting": "Anmeldung…", "ai.error": "Einladung konnte nicht angenommen werden",
  "pm.loading": "Wird geladen…", "pm.noConfig": "Zahlungen nicht konfiguriert.", "pm.empty": "Keine Karte gespeichert.",
  "pm.add": "+ Karte hinzufügen", "pm.remove": "Entfernen", "pm.save": "Karte speichern", "pm.saving": "Wird gespeichert…",
  "pm.cancel": "Abbrechen", "pm.errAdd": "Fehler beim Hinzufügen", "pm.errCardNotLoaded": "Karte nicht geladen",
  "pm.errNoGateway": "Gateway nicht konfiguriert", "pm.errCardInvalid": "ungültige Karte", "pm.taxIdPh": "CPF oder CNPJ des Karteninhabers", "pm.errTaxId": "gib eine gültige CPF oder CNPJ ein", "pm.phonePh": "Handy mit Vorwahl", "pm.zipPh": "Postleitzahl (CEP)", "pm.streetPh": "Straße", "pm.addrNumberPh": "Hausnummer", "pm.complementPh": "Zusatz (optional)", "pm.districtPh": "Stadtteil", "pm.cityPh": "Stadt", "pm.statePh": "Bundesstaat", "pm.errPhone": "gib die Telefonnummer mit Vorwahl ein", "pm.errAddress": "fülle PLZ, Straße, Hausnummer, Stadtteil, Stadt und Bundesstaat aus", "pm.errEmail": "dein Konto hat keine E-Mail, und der Zahlungsanbieter verlangt eine", "pm.billingTitle": "Rechnungsdaten vervollständigen",
  "pm.errSaveFailed": "Karte konnte nicht gespeichert werden", "pm.card": "Karte",
  "pm.numberPh": "Kartennummer", "pm.holderPh": "Name auf der Karte", "pm.mmPh": "MM", "pm.yyyyPh": "JJJJ", "pm.cvvPh": "CVV", "pm.docPh": "Steuernummer (CPF)",
  "rp.title": "Premium-Funktion", "rp.subtitle": "Abonniere, um diesen Inhalt freizuschalten.", "rp.cta": "Tarife ansehen",
  "ui.save": "Speichern", "ui.page": "Seite", "ui.of": "von", "ui.prev": "Zurück", "ui.next": "Weiter", "ui.scrollBack": "Zurück scrollen", "ui.scrollForward": "Weiter scrollen",
  "ui.pagination": "Seitennavigation", "ui.addItem": "Hinzufügen…", "ui.remove": "Entfernen",
  "rte.bold": "Fett", "rte.italic": "Kursiv", "rte.heading": "Überschrift", "rte.list": "Liste", "rte.image": "Bild", "rte.placeholder": "Schreiben…",
  "ui.more": "Mehr", "ui.menu": "Menü", "ui.back": "Zurück", "ui.close": "Schließen", "ui.confirm": "Bestätigen", "ui.cancel": "Abbrechen", "ui.select": "Auswählen…",
  "ui.search": "Suchen…", "ui.notFound": "Nichts gefunden.", "ui.pickDate": "Datum wählen",
  "ui.searchIcon": "Symbol suchen…", "ui.searchCountry": "Land suchen…",
  "auth.backHome": "Startseite", "auth.continueWith": "Weiter mit {p}", "auth.oauthCancelled": "Die Anmeldung wurde abgebrochen.", "auth.oauthRefused": "Dieses Konto kann sich bei dieser App nicht anmelden.", "auth.oauthUnavailable": "Diese Anmeldeoption ist gerade nicht verfügbar.", "auth.oauthFailed": "Die Anmeldung wurde nicht abgeschlossen. Bitte versuche es erneut.",
  "vp.play": "Abspielen",
  "vp.playPause": "Abspielen oder pausieren",
  "vp.back10": "10 Sekunden zurück",
  "vp.fwd10": "10 Sekunden vor",
  "vp.mute": "Stumm",
  "vp.speed": "Wiedergabegeschwindigkeit",
  "vp.quality": "Qualität",
  "vp.auto": "Auto",
  "vp.captions": "Untertitel",
  "vp.fullscreen": "Vollbild",
  "vp.progress": "Video-Fortschritt",
  "vp.playing": "Wird abgespielt",
  "vp.paused": "Pausiert",
  "vp.resumeTitle": "Dort weitermachen, wo du aufgehört hast?",
  "vp.resumeAt": "Du warst bei {time}",
  "vp.resume": "Weiter",
  "vp.fromStart": "Von vorn",
  "vp.expiredTitle": "Deine Sitzung ist abgelaufen",
  "vp.expiredBody": "Der Wiedergabelink gilt 2 Std.",
  "vp.reload": "Video neu laden",
  "vp.errorTitle": "Wir konnten dieses Video nicht laden",
  "vp.errorBody": "Sieht nach einem Verbindungsproblem aus. Dein Fortschritt ist gespeichert.",
  "vp.retry": "Erneut versuchen",
  "vp.goneTitle": "Dieses Video ist nicht mehr verfügbar",
  "vp.goneBody": "Es wurde möglicherweise entfernt.",
  "ch.conversations": "Unterhaltungen", "ch.conversation": "Unterhaltung", "ch.online": "jetzt online",
  "ch.placeholder": "Schreibe eine Nachricht…", "ch.send": "Senden", "ch.attach": "Anhängen", "ch.back": "Zurück",
  "ch.empty": "Noch keine Unterhaltungen", "ch.emptySub": "Wenn dir jemand schreibt, erscheint es hier.",
  "ch.threadEmpty": "Sag Hallo 👋", "ch.threadEmptySub": "Sei der Erste, der eine Nachricht sendet.",
  "ch.notSent": "Nicht gesendet", "ch.retry": "Erneut senden", "ch.loadError": "Nachrichten konnten nicht geladen werden",
  "bk.stepDate": "Datum", "bk.stepTime": "Uhrzeit", "bk.stepConfirm": "Bestätigen", "bk.month": "Monat", "bk.week": "Woche",
  "bk.times": "Zeiten", "bk.chooseTime": "wähle oben eine Uhrzeit", "bk.total": "Gesamt", "bk.confirm": "Termin bestätigen",
  "bk.confirming": "Wird bestätigt…", "bk.noAvail": "Keine Zeiten verfügbar", "bk.noAvailSub": "Versuche einen anderen Tag.",
  "bk.done": "Termin bestätigt!", "bk.min": "Min", "bk.prev": "Voriger Monat", "bk.next": "Nächster Monat",
  "fd.placeholder": "Teile etwas…", "fd.addImage": "Bild hinzufügen", "fd.publish": "Posten", "fd.empty": "Noch keine Beiträge",
  "fd.emptySub": "Sei der Erste, der etwas postet.", "fd.like": "Gefällt mir", "fd.comment": "Kommentieren", "fd.noComments": "Noch keine Kommentare",
  "fd.commentPh": "Schreibe einen Kommentar…", "fd.send": "Senden", "fd.loadMore": "Mehr laden",
  "rv.reviews": "Bewertungen", "rv.title": "Wie war deine Erfahrung?", "rv.sub": "Tippe auf die Sterne zum Bewerten.", "rv.placeholder": "Erzähl mehr… (optional)",
  "rv.submit": "Bewertung senden", "rv.submitting": "Wird gesendet…", "rv.helpful": "Hilfreich", "rv.empty": "Noch keine Bewertungen", "rv.emptySub": "Sei der Erste, der bewertet.", "rv.thanks": "Danke für deine Bewertung!", "rv.loginToReview": "Melde dich an, um zu bewerten.",
  "cx.noData": "Keine Daten im Zeitraum", "cx.noDataSub": "Passe den Datumsbereich an.", "cx.loadError": "Laden fehlgeschlagen", "cx.retry": "Erneut versuchen", "cx.total": "gesamt",
  "og.members": "Mitglieder", "og.pending": "ausstehend", "og.invite": "Einladen", "og.inviteMember": "Mitglied einladen", "og.inviteSub": "Wir senden eine Einladung per E-Mail.", "og.email": "E-Mail", "og.role": "Rolle",
  "og.cancel": "Abbrechen", "og.send": "Einladung senden", "og.createOrg": "Organisation erstellen", "og.newOrg": "Name der Organisation", "og.remove": "Entfernen", "og.empty": "Lade dein Team ein", "og.emptySub": "Du bist die einzige Person hier.", "og.you": "Du",
  "og.active": "Aktiv", "og.pendingStatus": "Ausstehend", "og.inactive": "Inaktiv", "og.owner": "Inhaber", "og.admin": "Admin", "og.editor": "Bearbeiter", "og.viewer": "Betrachter",
  "cv.stepUpload": "Hochladen", "cv.stepMap": "Zuordnen", "cv.stepPreview": "Vorschau", "cv.stepConfirm": "Bestätigen", "cv.upload": "Wähle eine .csv-Datei", "cv.uploadSub": "Kopfzeile in der ersten Zeile · max. 10 MB",
  "cv.invalidFile": "Ungültige Datei", "cv.invalidFileSub": "Verwende eine .csv mit Kopfzeile.", "cv.mapTitle": "Spalten zuordnen", "cv.mapSub": "Automatisch erkannt — bei Bedarf prüfen.", "cv.ignore": "Spalte ignorieren", "cv.preview": "Vorschau",
  "cv.incompleteMap": "Pflichtfeld nicht zugeordnet:", "cv.import": "Importieren", "cv.importing": "Wird importiert…", "cv.imported": "importiert", "cv.withError": "mit Fehler", "cv.line": "Zeile",
  "cv.chooseFields": "Export · Felder wählen", "cv.download": "CSV herunterladen", "cv.exporting": "Wird exportiert…",
  "dt.print": "Drucken", "dt.download": "PDF herunterladen", "dt.receiptTitle": "QUITTUNG", "dt.no": "Nr.", "dt.receivedFrom": "Erhalten von", "dt.total": "Gesamt", "dt.certTitle": "ABSCHLUSSZERTIFIKAT",
  "dt.awardedTo": "Verliehen an", "dt.director": "Direktor", "dt.seal": "SIEGEL", "dt.date": "Datum", "dt.report": "Bericht",
  "qr.download": "Herunterladen", "qr.share": "Teilen", "qr.scanHint": "Auf den QR richten", "qr.notSupported": "Scannen wird auf diesem Gerät nicht unterstützt", "qr.cameraError": "Kein Zugriff auf die Kamera", "qr.scanned": "Gescannt", "qr.invalid": "Ungültiger Code",
  "ax.scanTitle": "In deiner Authenticator-App scannen", "ax.scanSub": "Google Authenticator, Authy, 1Password…", "ax.orKey": "Oder gib den Schlüssel ein:", "ax.enterCode": "Code eingeben", "ax.enterCodeSub": "6 Ziffern aus deiner Authenticator-App.", "ax.verify": "Bestätigen", "ax.verifying": "Wird geprüft…",
  "ax.invalidCode": "Ungültiger Code", "ax.magicSent": "Wir haben einen Link gesendet 📩", "ax.magicCheck": "Prüfe", "ax.magicTap": "und tippe auf den Link zum Anmelden.", "ax.magicExpires": "Er läuft in {n} Minuten ab.", "ax.resend": "Link erneut senden", "ax.resendIn": "Erneut senden in",
  "qt.title": "Kostenloses Limit erreicht", "qt.subtitle": "Upgrade auf Premium für unbegrenzten Zugriff.", "qt.cta": "Tarife ansehen",
  "sg.title": "Premium nicht aktiv", "sg.body": "Dieses Konto hat keinen Premium-Zugang.",
  "pd.prev": "Vorige Seite", "pd.next": "Nächste Seite", "pd.page": "Seite", "pd.of": "von", "pd.zoomIn": "Vergrößern", "pd.zoomOut": "Verkleinern", "pd.bookmark": "Seite merken", "pd.loadError": "PDF konnte nicht geladen werden",
  "ag.today": "Heute", "ag.prev": "Vorige Woche", "ag.next": "Nächste Woche", "ag.block": "Blockieren", "ag.pickSlot": "Uhrzeit wählen", "ag.noSlots": "Keine freien Zeiten", "ag.cancel": "Abbrechen", "ag.noBookings": "Keine Buchungen an diesem Tag",
  "ag.confirm": "Bestätigen", "ag.reschedule": "Verschieben", "ag.confirmed": "Bestätigt", "ag.pending": "Ausstehend", "ag.canceled": "Storniert", "ag.completed": "Abgeschlossen", "ag.blocked": "Blockiert",
  "av.title": "Verfügbarkeit", "av.subtitle": "Deine wöchentlichen Arbeitszeiten", "av.add": "Hinzufügen", "av.addTitle": "Verfügbarkeit hinzufügen", "av.editTitle": "Verfügbarkeit bearbeiten", "av.edit": "Bearbeiten", "av.remove": "Entfernen", "av.empty": "Keine Verfügbarkeit festgelegt", "av.emptySub": "Füge deine Arbeitszeiten hinzu, damit Kunden buchen können.", "av.day": "Tag", "av.start": "Beginn", "av.end": "Ende", "av.save": "Speichern", "av.saving": "Speichern…", "av.cancel": "Abbrechen", "av.errRange": "Ende muss nach dem Beginn liegen.", "av.errSave": "Konnte nicht gespeichert werden. Erneut versuchen.",
};

const fr: Dict = {
  "push.enable": "Activer les notifications", "push.disable": "Désactiver les notifications",
  "ip.title": "Installer cette app", "ip.hint": "Ajoutez-la à l\u2019écran d\u2019accueil pour l\u2019ouvrir comme une app.", "ip.ios": "Touchez Partager, puis \u00ABSur l\u2019écran d\u2019accueil\u00BB.", "ip.cta": "Installer",
  "og.enterCode": "Saisir le code", "og.joinCode": "Rejoindre avec un code", "og.inviteCode": "Code d’invitation", "og.inviteCodeSub": "Partagez ce code pour que votre partenaire vous rejoigne.", "og.copy": "Copier", "og.copied": "Copié !", "og.pairTitle": "Connectez-vous à deux", "og.pairSubtitle": "Créez votre espace ou rejoignez avec un code.", "og.pairCreate": "Créer", "og.pairJoin": "Rejoindre", "og.pairNamePh": "Nommez votre espace", "og.pairCreateCta": "Créer l’espace", "og.pairJoinCta": "Rejoindre l’espace", "og.pairError": "Échec — vérifiez le code.",
  "cp.titleMust": "Définissez votre mot de passe", "cp.titleChange": "Changer le mot de passe",
  "cp.subMust": "Pour votre sécurité, choisissez un nouveau mot de passe pour continuer.",
  "cp.subChange": "Choisissez un nouveau mot de passe pour votre compte.",
  "cp.current": "Mot de passe actuel", "cp.new": "Nouveau mot de passe", "cp.save": "Enregistrer le mot de passe",
  "cp.saving": "Enregistrement…", "cp.updated": "Mot de passe mis à jour.", "cp.error": "impossible de changer le mot de passe",
  "ai.title": "Accepter l’invitation", "ai.subtitle": "Définissez votre nom et un mot de passe pour vous connecter.",
  "ai.invalid": "Invitation invalide ou expirée — demandez-en une nouvelle à l’administrateur.",
  "ai.name": "Votre nom", "ai.password": "Créez un mot de passe", "ai.submit": "Accepter et se connecter",
  "ai.submitting": "Connexion…", "ai.error": "impossible d’accepter l’invitation",
  "pm.loading": "Chargement…", "pm.noConfig": "Paiements non configurés.", "pm.empty": "Aucune carte enregistrée.",
  "pm.add": "+ Ajouter une carte", "pm.remove": "Retirer", "pm.save": "Enregistrer la carte", "pm.saving": "Enregistrement…",
  "pm.cancel": "Annuler", "pm.errAdd": "erreur lors de l’ajout", "pm.errCardNotLoaded": "carte non chargée",
  "pm.errNoGateway": "passerelle non configurée", "pm.errCardInvalid": "carte invalide", "pm.taxIdPh": "CPF ou CNPJ du titulaire", "pm.errTaxId": "saisis un CPF ou CNPJ valide", "pm.phonePh": "Mobile avec indicatif", "pm.zipPh": "Code postal (CEP)", "pm.streetPh": "Rue", "pm.addrNumberPh": "Numéro", "pm.complementPh": "Complément (facultatif)", "pm.districtPh": "Quartier", "pm.cityPh": "Ville", "pm.statePh": "État", "pm.errPhone": "saisis le téléphone avec l’indicatif", "pm.errAddress": "remplis code postal, rue, numéro, quartier, ville et état", "pm.errEmail": "ton compte n’a pas d’e-mail, et le moyen de paiement en exige un", "pm.billingTitle": "Complète tes données de facturation",
  "pm.errSaveFailed": "impossible d’enregistrer la carte", "pm.card": "carte",
  "pm.numberPh": "Numéro de carte", "pm.holderPh": "Nom sur la carte", "pm.mmPh": "MM", "pm.yyyyPh": "AAAA", "pm.cvvPh": "CVV", "pm.docPh": "Identifiant fiscal (CPF)",
  "rp.title": "Fonction premium", "rp.subtitle": "Abonnez-vous pour débloquer ce contenu.", "rp.cta": "Voir les offres",
  "ui.save": "Enregistrer", "ui.page": "Page", "ui.of": "sur", "ui.prev": "Précédent", "ui.next": "Suivant", "ui.scrollBack": "Défiler en arrière", "ui.scrollForward": "Défiler en avant",
  "ui.pagination": "Pagination", "ui.addItem": "Ajouter…", "ui.remove": "Retirer",
  "rte.bold": "Gras", "rte.italic": "Italique", "rte.heading": "Titre", "rte.list": "Liste", "rte.image": "Image", "rte.placeholder": "Écrivez…",
  "ui.more": "Plus", "ui.menu": "Menu", "ui.back": "Retour", "ui.close": "Fermer", "ui.confirm": "Confirmer", "ui.cancel": "Annuler", "ui.select": "Sélectionner…",
  "ui.search": "Rechercher…", "ui.notFound": "Aucun résultat.", "ui.pickDate": "Choisir une date",
  "ui.searchIcon": "Rechercher une icône…", "ui.searchCountry": "Rechercher un pays…",
  "auth.backHome": "Accueil", "auth.continueWith": "Continuer avec {p}", "auth.oauthCancelled": "La connexion a été annulée.", "auth.oauthRefused": "Ce compte ne peut pas se connecter à cette app.", "auth.oauthUnavailable": "Cette option de connexion n'est pas disponible pour le moment.", "auth.oauthFailed": "La connexion n'a pas abouti. Réessayez.",
  "vp.play": "Lire",
  "vp.playPause": "Lire ou mettre en pause",
  "vp.back10": "Reculer de 10 secondes",
  "vp.fwd10": "Avancer de 10 secondes",
  "vp.mute": "Muet",
  "vp.speed": "Vitesse de lecture",
  "vp.quality": "Qualité",
  "vp.auto": "Auto",
  "vp.captions": "Sous-titres",
  "vp.fullscreen": "Plein écran",
  "vp.progress": "Progression de la vidéo",
  "vp.playing": "Lecture en cours",
  "vp.paused": "En pause",
  "vp.resumeTitle": "Reprendre où vous en étiez ?",
  "vp.resumeAt": "Vous en étiez à {time}",
  "vp.resume": "Reprendre",
  "vp.fromStart": "Depuis le début",
  "vp.expiredTitle": "Votre session a expiré",
  "vp.expiredBody": "Le lien de lecture est valable 2 h.",
  "vp.reload": "Recharger la vidéo",
  "vp.errorTitle": "Impossible de charger cette vidéo",
  "vp.errorBody": "Cela ressemble à un problème de connexion. Votre progression est enregistrée.",
  "vp.retry": "Réessayer",
  "vp.goneTitle": "Cette vidéo n'est plus disponible",
  "vp.goneBody": "Elle a peut-être été supprimée.",
  "ch.conversations": "Conversations", "ch.conversation": "Conversation", "ch.online": "en ligne",
  "ch.placeholder": "Écrivez un message…", "ch.send": "Envoyer", "ch.attach": "Joindre", "ch.back": "Retour",
  "ch.empty": "Aucune conversation", "ch.emptySub": "Quand quelqu’un vous écrit, ça apparaît ici.",
  "ch.threadEmpty": "Dites bonjour 👋", "ch.threadEmptySub": "Soyez le premier à envoyer un message.",
  "ch.notSent": "Non envoyé", "ch.retry": "Réessayer", "ch.loadError": "Impossible de charger les messages",
  "bk.stepDate": "Date", "bk.stepTime": "Heure", "bk.stepConfirm": "Confirmer", "bk.month": "Mois", "bk.week": "Semaine",
  "bk.times": "Horaires", "bk.chooseTime": "choisissez une heure ci-dessus", "bk.total": "Total", "bk.confirm": "Confirmer le rendez-vous",
  "bk.confirming": "Confirmation…", "bk.noAvail": "Aucun horaire disponible", "bk.noAvailSub": "Essayez un autre jour.",
  "bk.done": "Rendez-vous confirmé !", "bk.min": "min", "bk.prev": "Mois précédent", "bk.next": "Mois suivant",
  "fd.placeholder": "Partagez quelque chose…", "fd.addImage": "Ajouter une image", "fd.publish": "Publier", "fd.empty": "Aucune publication",
  "fd.emptySub": "Soyez le premier à publier.", "fd.like": "J’aime", "fd.comment": "Commenter", "fd.noComments": "Aucun commentaire",
  "fd.commentPh": "Écrivez un commentaire…", "fd.send": "Envoyer", "fd.loadMore": "Charger plus",
  "rv.reviews": "avis", "rv.title": "Comment s’est passée votre expérience ?", "rv.sub": "Touchez les étoiles pour noter.", "rv.placeholder": "Dites-en plus… (facultatif)",
  "rv.submit": "Envoyer l’avis", "rv.submitting": "Envoi…", "rv.helpful": "Utile", "rv.empty": "Aucun avis", "rv.emptySub": "Soyez le premier à donner un avis.", "rv.thanks": "Merci pour votre avis !", "rv.loginToReview": "Connectez-vous pour laisser un avis.",
  "cx.noData": "Aucune donnée", "cx.noDataSub": "Ajustez la plage de dates.", "cx.loadError": "Échec du chargement", "cx.retry": "Réessayer", "cx.total": "total",
  "og.members": "Membres", "og.pending": "en attente", "og.invite": "Inviter", "og.inviteMember": "Inviter un membre", "og.inviteSub": "Nous enverrons une invitation par e-mail.", "og.email": "E-mail", "og.role": "Rôle",
  "og.cancel": "Annuler", "og.send": "Envoyer l’invitation", "og.createOrg": "Créer une organisation", "og.newOrg": "Nom de l’organisation", "og.remove": "Retirer", "og.empty": "Invitez votre équipe", "og.emptySub": "Vous êtes seul ici.", "og.you": "Vous",
  "og.active": "Actif", "og.pendingStatus": "En attente", "og.inactive": "Inactif", "og.owner": "Propriétaire", "og.admin": "Admin", "og.editor": "Éditeur", "og.viewer": "Lecteur",
  "cv.stepUpload": "Envoyer", "cv.stepMap": "Associer", "cv.stepPreview": "Aperçu", "cv.stepConfirm": "Confirmer", "cv.upload": "Choisissez un fichier .csv", "cv.uploadSub": "En-tête sur la première ligne · max 10 Mo",
  "cv.invalidFile": "Fichier invalide", "cv.invalidFileSub": "Utilisez un .csv avec en-tête.", "cv.mapTitle": "Associer les colonnes", "cv.mapSub": "Détection auto — vérifiez si besoin.", "cv.ignore": "Ignorer la colonne", "cv.preview": "Aperçu",
  "cv.incompleteMap": "Champ obligatoire non associé :", "cv.import": "Importer", "cv.importing": "Importation…", "cv.imported": "importées", "cv.withError": "en erreur", "cv.line": "Ligne",
  "cv.chooseFields": "Export · choisir les champs", "cv.download": "Télécharger le CSV", "cv.exporting": "Export…",
  "dt.print": "Imprimer", "dt.download": "Télécharger le PDF", "dt.receiptTitle": "REÇU", "dt.no": "N°", "dt.receivedFrom": "Reçu de", "dt.total": "Total", "dt.certTitle": "CERTIFICAT DE RÉUSSITE",
  "dt.awardedTo": "Décerné à", "dt.director": "Directeur", "dt.seal": "SCEAU", "dt.date": "Date", "dt.report": "Rapport",
  "qr.download": "Télécharger", "qr.share": "Partager", "qr.scanHint": "Visez le QR", "qr.notSupported": "La lecture n’est pas prise en charge sur cet appareil", "qr.cameraError": "Impossible d’accéder à la caméra", "qr.scanned": "Lu", "qr.invalid": "Code invalide",
  "ax.scanTitle": "Scannez dans votre app d’authentification", "ax.scanSub": "Google Authenticator, Authy, 1Password…", "ax.orKey": "Ou saisissez la clé :", "ax.enterCode": "Saisissez le code", "ax.enterCodeSub": "6 chiffres de votre app d’authentification.", "ax.verify": "Vérifier", "ax.verifying": "Vérification…",
  "ax.invalidCode": "Code invalide", "ax.magicSent": "Nous avons envoyé un lien 📩", "ax.magicCheck": "Vérifiez", "ax.magicTap": "et touchez le lien pour vous connecter.", "ax.magicExpires": "Il expire dans {n} minutes.", "ax.resend": "Renvoyer le lien", "ax.resendIn": "Renvoyer dans",
  "qt.title": "Limite gratuite atteinte", "qt.subtitle": "Passez au premium pour un accès illimité.", "qt.cta": "Voir les offres",
  "sg.title": "Premium non actif", "sg.body": "Ce compte n'a pas d'accès Premium.",
  "pd.prev": "Page précédente", "pd.next": "Page suivante", "pd.page": "Page", "pd.of": "sur", "pd.zoomIn": "Zoom avant", "pd.zoomOut": "Zoom arrière", "pd.bookmark": "Marquer la page", "pd.loadError": "Impossible de charger le PDF",
  "ag.today": "Aujourd’hui", "ag.prev": "Semaine précédente", "ag.next": "Semaine suivante", "ag.block": "Bloquer", "ag.pickSlot": "Choisissez une heure", "ag.noSlots": "Aucun horaire libre", "ag.cancel": "Annuler", "ag.noBookings": "Aucune réservation ce jour",
  "ag.confirm": "Confirmer", "ag.reschedule": "Reprogrammer", "ag.confirmed": "Confirmé", "ag.pending": "En attente", "ag.canceled": "Annulé", "ag.completed": "Terminé", "ag.blocked": "Bloqué",
  "av.title": "Disponibilité", "av.subtitle": "Vos horaires de travail hebdomadaires", "av.add": "Ajouter", "av.addTitle": "Ajouter une disponibilité", "av.editTitle": "Modifier la disponibilité", "av.edit": "Modifier", "av.remove": "Retirer", "av.empty": "Aucune disponibilité définie", "av.emptySub": "Ajoutez vos horaires pour que les clients réservent.", "av.day": "Jour", "av.start": "Début", "av.end": "Fin", "av.save": "Enregistrer", "av.saving": "Enregistrement…", "av.cancel": "Annuler", "av.errRange": "La fin doit être après le début.", "av.errSave": "Impossible d'enregistrer. Réessayez.",
};

const DICT: Record<FabLocale, Dict> = { en, "pt-BR": ptBR, es, de, fr };

/** It normalizes an arbitrary language code into a supported FabLocale (e.g. "pt", "pt_BR", "en-US" → pt-BR/en). */
export function normalizeLocale(locale?: string): FabLocale {
  if (!locale) return "en";
  const l = locale.replace("_", "-").toLowerCase();
  if (l === "pt-br" || l.startsWith("pt")) return "pt-BR";
  if (l.startsWith("es")) return "es";
  if (l.startsWith("de")) return "de";
  if (l.startsWith("fr")) return "fr";
  return "en";
}

/** It translates `key` in the given `locale`; it falls back to English when the key/language is missing. */
export function t(locale: string | undefined, key: FabI18nKey): string {
  const loc = normalizeLocale(locale);
  return DICT[loc]?.[key] ?? DICT.en[key] ?? key;
}
