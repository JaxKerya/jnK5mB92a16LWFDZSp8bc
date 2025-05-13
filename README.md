# Discord MP3 Oynatıcı Bot

Bu Discord botu, belirtilen sesli kanalda bir mp3 dosyasını oynatıp ardından kanaldan çıkar.

## Kurulum

1. Repo'yu klonlayın veya indirin
2. Gerekli paketleri yükleyin: `npm install`
3. `index.js` dosyasındaki `TOKEN` ve `CLIENT_ID` değerlerini kendi bot bilgilerinizle güncelleyin
4. `sounds` klasörüne `audio.mp3` adında bir ses dosyası ekleyin
5. Botu başlatın: `node index.js`

## Bot Kullanımı

1. Bot sunucunuzda olmalı ve gerekli izinlere sahip olmalı
2. Bir ses kanalına katılın
3. Herhangi bir metin kanalından `/oynat` komutunu girin
4. Bot ses kanalınıza katılacak, ses dosyasını oynatacak ve ardından ayrılacak

## Gerekli Discord İzinleri

Botunuz için Discord Developer Portal'da aşağıdaki izinleri etkinleştirin:
- `applications.commands` (Slash komutları için)
- `Bot` (Bot olarak çalışabilmesi için)
- Bot izinleri arasında:
  - `Connect` (Ses kanallarına bağlanmak için)
  - `Speak` (Ses kanallarında konuşmak için)

## Önemli Not

Bu bot, Discord API'lerini kullanabilmek için yeni Discord.js'nin gereksinimlerini karşılamak amacıyla Discord API v10 ile çalışmaktadır. Botunuzu Discord Developer Portal'da "Message Content Intent" izni açık olmalıdır. 