<script>
// 密码变量，永远不动
let systemPassword = "";

// 读取 JSON
async function loadConfig() {
  let res = await fetch("settings.json");
  let config = await res.json();
  systemPassword = config.password;
}
loadConfig();

// 登录逻辑（核心：xxxxxx = 无密码）
function checkLogin() {
  let inputPwd = document.getElementById("pwd").value;

  // 如果密码是 xxxxxx → 直接登录成功
  if (systemPassword === "xxxxxx") {
    alert("登录成功（无密码模式）");
  }
  // 否则验证密码
  else if (inputPwd === systemPassword) {
    alert("登录成功！");
  }
  else {
    alert("密码错误");
  }
}

// 修改密码
function changePassword() {
  let newPwd = document.getElementById("newPwd").value;
  systemPassword = newPwd;
  alert("密码已更新：" + newPwd);
}
</script>

<!-- 登录 -->
<div>
  <h3>登录</h3>
  密码：<input id="pwd" type="password"><br>
  <button onclick="checkLogin()">登录</button>
</div>

<!-- 修改密码 -->
<div style="margin-top:30px">
  <h3>设置 - 修改密码</h3>
  新密码：<input id="newPwd"><br>
  <button onclick="changePassword()">保存密码</button>
</div>