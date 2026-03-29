<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Next PS — Login</title>

<!-- Google Fonts Optimized -->
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Quicksand:wght@400;500;600;700&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet"></noscript>

<style>
:root{--gold:#f0c040;--gold-light:#ffe07a;--gold-dim:rgba(240,192,64,.15);--gold-glow:rgba(240,192,64,.35);--crystal:#6ec6ff;--crystal-glow:rgba(110,198,255,.3);--bg-card:rgba(12,8,24,.82);--bg-input:rgba(20,14,40,.75);--border:rgba(240,192,64,.18);--text:#f0e8d8;--text-dim:#9a8e78}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body{height:100%;-webkit-overflow-scrolling:touch}
body{min-height:100vh;background:url("https://raw.githubusercontent.com/Ninepiaths1/backend/refs/heads/main/backgroundnextps.png") no-repeat center center/cover,#0a0614;display:flex;justify-content:center;align-items:flex-start;padding-top:40px;font-family:'Quicksand',sans-serif;overflow-x:hidden;overflow-y:auto}
.overlay{position:fixed;inset:0;background:radial-gradient(ellipse at 30% 20%,rgba(240,180,50,.06) 0%,transparent 50%),radial-gradient(ellipse at 50% 50%,rgba(6,4,16,.25) 0%,rgba(4,2,12,.7) 55%,rgba(2,1,8,.92) 100%);z-index:1}
.fireflies{position:fixed;inset:0;z-index:1;overflow:hidden;pointer-events:none}
.firefly{position:absolute;border-radius:50%;opacity:0;animation:drift ease-in-out infinite;width:2px;height:2px}
.firefly.gold{background:var(--gold);box-shadow:0 0 6px var(--gold-glow),0 0 12px var(--gold-glow)}
.firefly.crystal{background:var(--crystal);box-shadow:0 0 6px var(--crystal-glow),0 0 12px var(--crystal-glow)}
@keyframes drift{0%{opacity:0;transform:translate(0,0) scale(.5)}15%{opacity:.9}50%{opacity:.4;transform:translate(40px,-60px) scale(1)}85%{opacity:.8}100%{opacity:0;transform:translate(-20px,-120px) scale(.3)}}
.login-container{position:relative;z-index:2;background:var(--bg-card);backdrop-filter:blur(24px) saturate(1.3);border:1px solid var(--border);border-radius:18px;padding:34px 26px 26px;width:92%;max-width:370px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.6)}
.form-control{width:100%;padding:12px;margin-bottom:10px;border-radius:10px;border:1px solid var(--border);font-size:14px;font-family:'Quicksand',sans-serif;background:var(--bg-input);color:var(--text);transition:border-color .2s}
.form-control:focus{border-color:var(--gold);outline:0;box-shadow:0 0 0 2px var(--gold-dim)}
.btn-login{width:100%;padding:12px;background:linear-gradient(135deg,#c89520,#f0c040,#ffe07a);border:none;border-radius:10px;font-size:14px;font-family:'Cinzel',serif;font-weight:700;color:#1a0e00;cursor:pointer;transition:transform .1s,box-shadow .2s}
.btn-login:hover{transform:translateY(-1px);box-shadow:0 8px 25px var(--gold-dim)}
.btn-login:active{transform:scale(.98)}
.btn-register{width:100%;padding:11px;margin-top:10px;background:transparent;border:1px solid var(--border);border-radius:10px;font-size:12px;font-family:'Quicksand',sans-serif;color:var(--gold-light);cursor:pointer;transition:opacity .2s,transform .1s}
.btn-register:hover{opacity:.9;transform:translateY(-1px)}
h2{color:#fff;margin-bottom:15px;font-family:'Cinzel',serif;font-weight:700;font-size:24px}
</style>
</head>

<body>
<div class="overlay"></div>
<div class="fireflies" id="fireflies"></div>

<div class="login-container">
    <h2>Next PS Login</h2>
    
    <!-- LOGIN FORM - Sinkron dengan backend /player/growid/login/validate -->
    <form id="loginForm" method="POST" action="/player/growid/login/validate">
        <input type="hidden" name="_token" value="{{ data }}"/>
        <input type="text" name="growId" class="form-control" placeholder="GrowID" required autocomplete="username"/>
        <input type="password" name="password" class="form-control" placeholder="Password" required autocomplete="current-password"/>
        <input type="submit" class="btn-login" value="Login"/>
    </form>

    <!-- REGISTER BUTTON - Kirim data kosong untuk register -->
    <button type="submit" form="registerForm" class="btn-register">Create New Account</button>
    
    <!-- REGISTER FORM - Data kosong sesuai backend logic -->
    <form id="registerForm" method="POST" action="/player/growid/login/validate">
        <input type="hidden" name="_token" value="{{ data }}"/>
        <input type="hidden" name="growId" value=""/>
        <input type="hidden" name="password" value=""/>
    </form>
</div>

<!-- JavaScript Optimized (12 fireflies) -->
<script>
(()=>{const c=document.getElementById('fireflies'),colors=['gold','gold','crystal'];for(let i=0;i<12;i++){const f=document.createElement('div');f.className='firefly '+colors[Math.floor(Math.random()*3)],f.style.left=Math.random()*100+'%',f.style.top=(30+Math.random()*70)+'%',f.style.animationDuration=(5+Math.random()*6)+'s',f.style.animationDelay=Math.random()*4+'s',c.appendChild(f)}})();
</script>

</body>
</html>
