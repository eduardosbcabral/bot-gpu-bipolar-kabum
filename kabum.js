const cookiesFilePath = './cookies.json';
const jsonfile = require('jsonfile')
const fileExists = require('./existsSync')
const secrets = require('./secrets');

const url_kabum = 'https://www.kabum.com.br';

const tracked_words = [
  'RTX 2080 TI',
  'RTX 2070 SUPER',
  'RTX 3070',
  'RTX 3080'
];

const coupons = [
  'EMERSONBR',
  'ALANZOKA'
]

class Kabum {

  constructor(page, browser) {
    this.page = page;
    this.browser = browser;
  }

  async start() {
    await this.loadSession();
    await this.page.setDefaultNavigationTimeout(60000);
    await this.page.goto(url_kabum, {waitUntil: 'domcontentloaded'});

    const sessionIsLoaded = await this.sessionIsLoaded();
    console.log(sessionIsLoaded);
    if(!sessionIsLoaded) {
      await this.login();
      await this.saveSession();
    }
  }

  async loadSession() {
    const previousSession = fileExists(cookiesFilePath);
    if (previousSession) {
      const cookiesArr = require(cookiesFilePath);
      if (cookiesArr.length !== 0) {
        for (let cookie of cookiesArr) {
          await this.page.setCookie(cookie)
        }
        console.log('[INFO] SESSÃO CARREGADA NO BROWSER.');
      }
    }
  }

  async saveSession() {
    const cookiesObject = await this.page.cookies()
    jsonfile.writeFile(cookiesFilePath, cookiesObject, { spaces: 2 },
      (err) => { 
      if (err) console.log('[ERROR] ERRO AO ESCREVER O ARQUIVO DE COOKIES: ', err);

      console.log('[INFO] SESSÃO SALVA COM SUCESSO.')
    })
  }

  async sessionIsLoaded() {
    return await this.page.$('a[href="https://www.kabum.com.br/cgi-local/site/login/login.cgi"]') === null;
  }

  async login() {
    this.page.click('a[href="https://www.kabum.com.br/cgi-local/site/login/login.cgi"]');
    await this.page.waitForNavigation();

    await this.page.type('#textfield12', secrets.email);
    await this.page.type('[name="senha"]', secrets.password);

    this.page.click('input[src="https://static.kabum.com.br/conteudo/temas/001/imagens/login/botao_logar.png"]');
    await this.page.waitForNavigation();
  }

  async search(text_search) {
    await this.page.waitForSelector('.sprocura');
    await this.page.type('.sprocura', text_search);
      
    this.page.click('#bt-busca');
    await this.page.waitForNavigation();
  }

  async open_product(text_search) {
    try {
      this.page.click('#listagem-produtos a');
       await this.page.waitForNavigation();
    } catch (err) {
      console.log("[ERROR] PESQUISA NAO ENCONTROU RESULTADOS - " + text_search);
			this.browser.close();
			throw err;
    };
  }

  async check_price(text_search, selected_word) {
    const preco_limite_2080 = parseFloat('5.000,00');
    const preco_limite_3080 = parseFloat('6.000,00');
    const preco_limite_2070 = parseFloat('3.000,00');
    const preco_limite_3070 = parseFloat('5.000,00');

    let priceFloat = 0;

    try {
      const priceText = await this.page.$eval('.preco_desconto_avista-cm, .preco_desconto > span > span > strong', element => element.innerText);
      priceFloat = parseFloat(priceText.split(' ')[1]);
    
      if(selected_word === tracked_words[1]) {
        if(priceFloat > preco_limite_2070) {
          console.log("[ERROR] O PREÇO DO PRODUTO ESTÁ ACIMA DO LIMITE - " + text_search + " (" + priceFloat + ")");
					this.browser.close();
					throw err;
					return;
        }
      } else if(selected_word === tracked_words[0]) {
        if(priceFloat > preco_limite_2080) {
          console.log("[ERROR] O PREÇO DO PRODUTO ESTÁ ACIMA DO LIMITE - " + text_search + " (" + priceFloat + ")");
					this.browser.close();
					throw err;
					return;
        }
      } else if(selected_word === tracked_words[3]) {
          if(priceFloat > preco_limite_3080) {
            console.log("[ERROR] O PREÇO DO PRODUTO ESTÁ ACIMA DO LIMITE - " + text_search + " (" + priceFloat + ")");
						this.browser.close();
						throw err;
						return;
          }
      } else if(selected_word === tracked_words[2]) {
        if(priceFloat > preco_limite_3070) {
          console.log("[ERROR] O PREÇO DO PRODUTO ESTÁ ACIMA DO LIMITE - " + text_search + " (" + priceFloat + ")");
					this.browser.close();
					throw err;
					return;
        }
      }

      console.log("[INFO] PREÇO DO PRODUTO VÁLIDO PARA O LIMITE DA CATEGORIA (" + priceFloat + ") - " + text_search);
    } catch (err) {
      console.log("[ERROR] ERRO AO TENTAR RECUPERAR O PREÇO DO PRODUTO - " + text_search);
			this.browser.close();
			throw err;
    }
  }

  async add_to_cart(text_search) {
    try {
      this.page.click('.botao-comprar');
      await this.page.waitForNavigation();
    } catch (err) {
			console.log("[ESGOTADA] " + new Date().toLocaleString() + " - " + text_search);
			this.browser.close();
			throw err;
    }
  }

  async next_cart_page() {
		try {
			this.page.click('a[href="https://www.kabum.com.br/cgi-local/site/carrinho/carrinho.cgi"]');
			await this.page.waitForNavigation();
		} catch(err) {
			console.log('[ERROR] OCORREU UM ERRO AO CLICAR EM PROCEDER NO PARA CHECKOUT.', err);
			this.browser.close();
			throw err;
		}
  }

  async add_coupon() {
    await this.page.type('input[name="discountCoupon"]', coupons[0]);
    this.page.click('form > input[type="submit"]');
    await this.delay(4000);
  }

  async checkout() {
    const [buttonFinalizarCompraPrev] = await this.page.$x("//button[contains(., 'Finalizar Compra')]");
    if(buttonFinalizarCompraPrev) {
      buttonFinalizarCompraPrev.click();
      await this.page.waitForNavigation();
    } else {
      console.log("[ERROR] Ocorreu um erro ao clicar no botão de Finalizar Compra 1");
			this.browser.close();
			throw err;
    }
  }

  async confirm_data_after_checkout() {
    this.page.click('input[type="submit"]');
    await this.page.waitForSelector("html");
  }

  async end_checkout() {
    this.page.click('button[type="submit"]');
    await this.page.waitForSelector("html");
  }

  async wait_page_loading() {
    await this.page.waitForSelector("html");
  }

  delay(time) {
    return new Promise(function(resolve) { 
			setTimeout(resolve, time)
    });
  }
}

module.exports = Kabum;