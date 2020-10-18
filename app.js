const config = require('./config');
const puppeteer = require('puppeteer');

const Twit = require('twit');
const Kabum = require('./kabum');
const T = new Twit(config);

const tracked_account_id = '1257205781352656897'; // eduardosbcabral
//const tracked_account_id = '1285199873890045953'; // GPU BIPOLAR

const tracked_words = [
  'RTX 2080 TI',
  'RTX 2070 SUPER',
  'RTX 3070',
  'RTX 3080'
];

main = () => {
  const stream = T.stream('statuses/filter', { follow: [tracked_account_id] });
  stream.on('tweet', async function (tweet) {
    if(tweet.user.id_str !== tracked_account_id) return;
    let text_lower_case = '';
    try {
      text_lower_case = tweet.extended_tweet.full_text.toLowerCase();
      console.log(text_lower_case);
    } catch(err) {
      console.log('[CRITICAL ERROR] OCORREU UM ERRO NO ACESSO AO TWEET: ', err);
    }
    
    if(text_lower_case !== '') {
      for(const word of tracked_words) {
        const regex = new RegExp('.*'+word.toLowerCase()+'.*');
        const match = text_lower_case.match(regex);
        if(match.length > 0) {
          console.log('achou');
          await iniciarBrowser(match[0], word);
          break;
        }
      }
    }
  });
}

iniciarBrowser = async (text_search, selected_word) => {
  const browser = await puppeteer.launch({
    product: 'chrome',
    headless: false,
  });
  const page = await browser.newPage();

  const kabum = new Kabum(page, browser);

  await kabum.start();

  await kabum.search(text_search);

  await kabum.open_product(text_search);

  await kabum.check_price(text_search, selected_word);

  await kabum.add_to_cart(text_search);

  await kabum.next_cart_page();

  await kabum.add_coupon();

  await kabum.checkout();

  await kabum.confirm_data_after_checkout();

  //await kabum.end_checkout();
}

console.log('[BEGIN] APLICAÇÃO INICIADA. PROCURANDO POR PROMOÇÕES DAS GPUs 2070 SUPER, 2080 TI, 3070 e 3080 de acordo com os tweets do perfil GPU BIPOLAR no Twitter!');
//main();
iniciarBrowser('EVGA GeForce RTX 2070 Super XC Gaming', tracked_words[0]);