/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
let swaggerUI;

let buttonElements = document.createElement("div");

const logInBtn = document.createElement("button");
const addressText = document.createElement("div");
const signatureText = document.createElement("div");

logInBtn.innerText = "Log In With MetaMask";
logInBtn.style.fontWeight = "bold";
logInBtn.id = "log-in-btn";

logInBtn.style.padding = "10px";

buttonElements.style.padding = "20px 20px 0 20px";
buttonElements.style.textAlign = "center";
logInBtn.style.marginRight = "20px";

buttonElements.appendChild(logInBtn);
buttonElements.appendChild(addressText);
buttonElements.appendChild(signatureText);

const checkExist = setInterval(function () {
  swaggerUI = document.querySelector(".swagger-ui");
  if (swaggerUI !== null) {
    clearInterval(checkExist);

    // Add this method with your code
    const topBar = swaggerUI.querySelector(".topbar");

    topBar.insertAdjacentElement("afterend", buttonElements);
  }
}, 100); // check every 100ms

var version = (function (exports) {
  "use strict";
  class GameAPI {
    baseUrl = ``;

    async login(loginDto) {
      try {
        const response = await fetch(`${this.baseUrl}/auth/login`, {
          method: "POST",
          body: JSON.stringify(loginDto),
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        return data;
      } catch (error) {
        console.log(error, "login error");
      }
    }

    async getNonce(address) {
      try {
        const response = await fetch(`${this.baseUrl}/auth/get-nonce/${address}`);
        const data = await response.json();
        return data;
      } catch (error) {
        console.log(error, "get nonce error");
      }
    }

    async refreshToken(refreshToken) {
      const response = await fetch(`${this.baseUrl}/auth/refresh-tokens`, {
        method: "POST",
        body: JSON.stringify({
          refreshToken: refreshToken,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      return data;
    }
  }

  class EtherumWallet {
    async getAccount() {
      try {
        const accounts = await ethereum.request({
          method: "eth_requestAccounts",
        });
        return accounts[0];
      } catch (error) {
        if (error.code === 4001) {
          // EIP-1193 userRejectedRequest error
          // If this happens, the user rejected the connection request.
          console.log("Please connect to MetaMask.");
        } else {
          console.error(error, "Error get metamask account");
        }
      }
    }

    async signatureMessage(publicAddress, nonce) {
      try {
        // personal_sign
        const msg = `Sign this message to prove you have access to this wallet in order to sign in to BO Finance\n\nNonce: ${nonce}`;
        return await ethereum.request({
          method: 'personal_sign',
          params: [msg, publicAddress, ''],
        });
      } catch (error) {
        console.error(error, "Error personal sign signature");
      }
    }
  }

  class ManageCookie {
    setCookie(name, value, moreOptions) {
      const options = {
        path: "/",
        // add other defaults here if necessary
        secure: true,
        ...moreOptions,
      };

      if (options.expires instanceof Date) {
        options.expires = options.expires.toUTCString();
      }

      let updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value);

      for (let optionKey in options) {
        updatedCookie += "; " + optionKey;
        let optionValue = options[optionKey];

        if (optionValue !== true) {
          updatedCookie += "=" + optionValue;
        }
      }

      document.cookie = updatedCookie;
    }

    deleteCookie(name) {
      this.setCookie(name, "", {
        "max-age": -1,
      });
    }

    saveToLoginSessionToBrowser(responseLogin) {
      this.setCookie("access_token", responseLogin.accessToken.token, {
        expires: responseLogin.accessToken.expires,
        sameSite: "Lax",
      });
      this.setCookie("refresh_token", responseLogin.refreshToken.token, {
        expires: responseLogin.refreshToken.expires,
        sameSite: "Lax",
      });
    }

    getCookie(name) {
      let matches = document.cookie.match(
        new RegExp("(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1") + "=([^;]*)"),
      );
      return matches ? decodeURIComponent(matches[1]) : undefined;
    }
  }

  console.log("Hello from BO");
  const gameAPI = new GameAPI();
  const etherumWallet = new EtherumWallet();
  const manageCookie = new ManageCookie();
  // const connectButton = document.querySelector("#connectButton");
  // const logoutButton = document.querySelector("#logoutButton");
  let currentWalletAddress = null;

  if (logInBtn) {
    logInBtn.addEventListener("click", () => {
      connect();
    });
  }

  function askToInstallMetaMask() {
    const answer = window.confirm("MetaMask isn't installed 👀 \n \nDownload now and try connect again?");

    if (answer === true) {
      window.open("https://metamask.io/download", "_blank");
    }
  }

  async function connect() {
    if (typeof ethereum !== "undefined") {
      console.log("MetaMask is installed!");
      currentWalletAddress = await etherumWallet.getAccount();
      const responseNonce = await gameAPI.getNonce(currentWalletAddress);
      const signature = await etherumWallet.signatureMessage(responseNonce.address, responseNonce.nonce);
      console.log(currentWalletAddress);
      console.log(signature);
      addressText.innerText = !signature ? "" : `address:\n ${currentWalletAddress}`;
      signatureText.innerText = !signature ? "" : `signature:\n ${signature}`;
    } else {
      askToInstallMetaMask();
    }
  }

  async function updateCookieWhenAccessTokenExpire() {
    const accessToken = manageCookie.getCookie("access_token");
    const refreshToken = manageCookie.getCookie("refresh_token");

    if (!accessToken && refreshToken) {
      // call api refresh
      const responseRefreshToken = await gameAPI.refreshToken(refreshToken);
      manageCookie.saveToLoginSessionToBrowser(responseRefreshToken);
    }
  }
  function getTokensFromCookie() {
    const accessToken = manageCookie.getCookie("access_token");
    const refreshToken = manageCookie.getCookie("refresh_token");
    const result = {
      accessToken,
      refreshToken,
    };
    return JSON.stringify(result);
  }
  function getAccessToken() {
    return manageCookie.getCookie("access_token");
  }
  function getRefreshToken() {
    return manageCookie.getCookie("refresh_token");
  }

  function disconnectAccount() {
    console.log("disconneted");
    manageCookie.deleteCookie("access_token");
    manageCookie.deleteCookie("refresh_token");
    const accessToken = manageCookie.getCookie("access_token");
    const refreshToken = manageCookie.getCookie("refresh_token");

    if (accessToken) {
      manageCookie.deleteCookie("access_token");
    }

    if (refreshToken) {
      manageCookie.deleteCookie("refresh_token");
    }

    currentWalletAddress = null;
  }

  ethereum.on("accountsChanged", (accounts) => {
    // If user has locked/logout from MetaMask, this resets the accounts array to empty
    if (!accounts.length) {
      // logic to handle what happens once MetaMask is locked
      disconnectAccount();
      window.alert("Disconnected from Metamask\n\nPlease reload and try again 👍");
      window.location.reload();
    } else if (accounts[0] !== currentWalletAddress) {
      currentWalletAddress = accounts[0]; // Do any other work!
    }
  }); // ethereum.removeListener("accountsChanged", handleAccountsChanged)

  ethereum.on("chainChanged", (_chainId) => window.location.reload());

  exports.getAccessToken = getAccessToken;
  exports.getRefreshToken = getRefreshToken;
  exports.getTokensFromCookie = getTokensFromCookie;
  exports.updateCookieWhenAccessTokenExpire = updateCookieWhenAccessTokenExpire;

  Object.defineProperty(exports, "__esModule", { value: true });

  return exports;
})({});
