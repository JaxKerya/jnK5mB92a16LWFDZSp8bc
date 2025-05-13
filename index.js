const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, NoSubscriberBehavior, entersState } = require('@discordjs/voice');
const { join } = require('path');
const fs = require('fs');
// Ses dosyası konfigürasyonu
const soundConfig = require('./soundConfig');

// Bot token ve client ID

//// Deneme Bot
// const tokenPart1 = 'MTAwMDU0NTAzODkyMjY5ODc3NA.Gk4BSJ';
// const tokenPart2 = '.PUWHHxKvwkRQuo38Q6cBWmVr6VIEPKRfOrC1yg';

//// Deneme Bot
// const CLIENT_ID = '1000545038922698774'; 

//// Şifa Kaynağı
const tokenPart1 = 'MTM3MTUwNTE0MDg2NzAxMDYyMQ.GkXovK';
const tokenPart2 = '.dM4gX0Z3rVF0k61rolyuiWcP_RukhBXEqmB3MM';

//// Şifa Kaynağı
const CLIENT_ID = '1371505140867010621'; 

const TOKEN = tokenPart1 + tokenPart2; // Botunuzun token'ını buraya yerleştirin


// Ses dosyaları klasörü
const SOUNDS_FOLDER = join(__dirname, 'sounds');

// Discord client oluşturma
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Komut tanımlama
const commands = [
  new SlashCommandBuilder()
    .setName('arın')
    .setDescription('Kullanıcıları arındırır.'),
];

// REST API ile komutları kaydetme
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('Slash komutları kaydediliyor...');

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands },
    );

    console.log('Slash komutlar başarıyla kaydedildi!');
  } catch (error) {
    console.error('Komutları kaydederken bir hata oluştu:', error);
    console.error('Lütfen TOKEN ve CLIENT_ID değerlerinin doğru olduğundan emin olun.');
  }
})();

// Bot başlatma hata yakalama
client.login(TOKEN).catch(error => {
  console.error('Bot giriş yapamadı:', error);
  console.error('Lütfen TOKEN değerinin doğru olduğundan emin olun.');
  process.exit(1);
});

// Bot hazır olduğunda
client.once('ready', () => {
  console.log(`Bot olarak giriş yapıldı: ${client.user.tag}`);
  
  // Ses dosyalarının varlığını kontrol et
  if (!fs.existsSync(SOUNDS_FOLDER)) {
    console.warn(`UYARI: ${SOUNDS_FOLDER} klasörü bulunamadı. Lütfen 'sounds' klasörü oluşturun.`);
  } else {
    const soundFiles = getSoundFiles();
    if (soundFiles.length === 0) {
      console.warn(`UYARI: ${SOUNDS_FOLDER} klasöründe ses dosyası bulunamadı. Lütfen ses dosyaları ekleyin.`);
    } else {
      console.log(`Bulunan ses dosyaları: ${soundFiles.map(sound => sound.filename).join(', ')}`);
    }
  }
});

// Ses dosyalarını al ve konfigürasyona göre hazırla
function getSoundFiles() {
  try {
    const files = fs.readdirSync(SOUNDS_FOLDER)
      .filter(file => file.endsWith('.mp3') || file.endsWith('.wav') || file.endsWith('.ogg'));
    
    // Ses dosyaları ile bilgileri döndür
    return files.map(file => {
      // Eğer dosya için özel bir yapılandırma varsa kullan, yoksa varsayılan değerler kullan
      const config = soundConfig[file] || { 
        displayName: file, 
        description: `${file} dosyasını çal` 
      };
      
      return {
        filename: file,
        displayName: config.displayName,
        description: config.description
      };
    });
  } catch (error) {
    console.error('Ses dosyalarını alırken hata:', error);
    return [];
  }
}

// Hata yakalama
client.on('error', error => {
  console.error('Bot bir hata ile karşılaştı:', error);
});

// Bağlantı kapatıldığında
client.on('shardDisconnect', (event, id) => {
  console.log(`Bot #${id} bağlantısı kesildi:`, event);
});

// Ses dosyasını çal
async function playSound(interaction, soundFile) {
  try {
    const member = interaction.member;
    
    if (!member.voice.channel) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({ content: 'Bir ses kanalında olmalısınız!', ephemeral: true });
      } else {
        return interaction.followUp({ content: 'Bir ses kanalında olmalısınız!', ephemeral: true });
      }
    }

    const soundPath = join(SOUNDS_FOLDER, soundFile);
    // Ses dosyasının varlığını kontrol et
    if (!fs.existsSync(soundPath)) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({ 
          content: `${soundFile} ses dosyası bulunamadı!`, 
          ephemeral: true 
        });
      } else {
        return interaction.followUp({ 
          content: `${soundFile} ses dosyası bulunamadı!`, 
          ephemeral: true 
        });
      }
    }

    // Kullanıcının bulunduğu ses kanalına katıl
    const voiceChannel = member.voice.channel;
    
    // Ses dosyası yapılandırmasını al
    const config = soundConfig[soundFile] || { 
      displayName: soundFile,
      playMessage: "Ses dosyası çalınıyor..." // varsayılan mesaj
    };
    const displayName = config.displayName;
    const playMessage = config.playMessage || "Ses dosyası çalınıyor..."; // özel mesaj yoksa varsayılan kullan
    
    // Herkesin göreceği şekilde mesaj gönder
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [{
          description: playMessage,
          color: 0x5E0B15
        }],
        ephemeral: false // Herkes görebilsin
      });
    } else {
      await interaction.followUp({
        embeds: [{
          description: playMessage,
          color: 0x5E0B15
        }],
        ephemeral: false // Herkes görebilsin
      });
    }
    
    let connection;
    try {
      // Sesli kanala bağlan
      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });
    } catch (connectionError) {
      console.error('Ses kanalına bağlanırken hata:', connectionError);
      return interaction.followUp({
        content: 'Ses kanalına bağlanırken bir hata oluştu. Yetkilere sahip olduğumdan emin olun.',
        ephemeral: true
      });
    }
    
    // Bağlantı hata işleme
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        console.log('Bağlantı kesildi, bağlantı kapatılıyor...');
        connection.destroy();
      } catch (error) {
        console.error('Bağlantıyı kapatırken hata:', error);
        connection.destroy();
      }
    });
    
    connection.on(VoiceConnectionStatus.Destroyed, () => {
      console.log('Bağlantı tamamen kapatıldı.');
    });
    
    connection.on('error', error => {
      console.error('Ses bağlantı hatası:', error);
      interaction.followUp({
        content: 'Ses bağlantısında bir hata oluştu!',
        ephemeral: true
      }).catch(console.error);
      connection.destroy();
    });
      
    // Ses dosyasını oynat
    try {
      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Pause,
        },
      });
      
      const resource = createAudioResource(soundPath);
      
      player.on('error', error => {
        console.error('Ses oynatma hatası:', error);
        interaction.followUp({
          content: 'Ses dosyasını oynatırken bir hata oluştu!',
          ephemeral: true
        }).catch(console.error);
        connection.destroy();
      });
      
      // Oynatma bittiğinde ses kanalından çık
      player.on(AudioPlayerStatus.Idle, () => {
        console.log('Ses dosyası oynatma tamamlandı, kanaldan çıkılıyor...');
        try {
          connection.destroy();
        } catch (error) {
          console.error('Kanaldan çıkarken hata:', error);
        }
      });
      
      // Oynatma başladığında
      player.on(AudioPlayerStatus.Playing, () => {
        console.log(`Ses dosyası oynatılıyor...`);
      });
      
      // Bağlantı kurulduğunda
      connection.on(VoiceConnectionStatus.Ready, () => {
        console.log('Ses kanalına başarıyla bağlandı!');
        connection.subscribe(player);
        player.play(resource);
      });
      
    } catch (playError) {
      console.error('Ses oynatıcısı oluşturulurken hata:', playError);
      interaction.followUp({
        content: 'Ses dosyasını oynatırken bir hata oluştu!',
        ephemeral: true
      }).catch(console.error);
      connection.destroy();
    }
  } catch (error) {
    console.error('Genel hata:', error);
    if (!interaction.replied && !interaction.deferred) {
      interaction.reply({
        content: 'Bir hata oluştu!',
        ephemeral: true
      }).catch(console.error);
    } else {
      interaction.followUp({
        content: 'Bir hata oluştu!',
        ephemeral: true
      }).catch(console.error);
    }
  }
}

// Slash komut işleyicisi
client.on('interactionCreate', async interaction => {
  // Slash komutları işle
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;

    if (commandName === 'arın') {
      try {
        // Kullanıcının ses kanalında olup olmadığını kontrol et
        const member = interaction.member;
        
        if (!member.voice.channel) {
          return interaction.reply({ content: 'Bir ses kanalında olmalısınız!', ephemeral: true });
        }

        // Ses dosyalarını al
        const soundFiles = getSoundFiles();
        
        if (soundFiles.length === 0) {
          return interaction.reply({
            content: 'Hiçbir ses dosyası bulunamadı! Lütfen botun yöneticisine haber verin.',
            ephemeral: true
          });
        }

        // Dropdown menü oluştur
        const row = new ActionRowBuilder()
          .addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('sound_select')
              .setPlaceholder('Arınma kaynağını seçin')
              .addOptions(soundFiles.map(sound => ({
                label: sound.displayName,
                value: sound.filename,
                description: sound.description
              })))
          );

        // Sadece komutu kullanan kullanıcıya göster
        await interaction.reply({
          content: 'Hangisiyle arınmak istiyorsunuz:',
          components: [row],
          ephemeral: true
        });
        
      } catch (error) {
        console.error('Genel hata:', error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: 'Bir hata oluştu!', ephemeral: true }).catch(console.error);
        } else {
          await interaction.reply({ content: 'Bir hata oluştu!', ephemeral: true }).catch(console.error);
        }
      }
    }
  } 
  // Combobox seçimini işle
  else if (interaction.isStringSelectMenu() && interaction.customId === 'sound_select') {
    try {
      // Önce deferReply kullanarak etkileşimi kabul et
      await interaction.deferReply({ ephemeral: false });
      
      const selectedSound = interaction.values[0];
      await playSound(interaction, selectedSound);
    } catch (error) {
      console.error('Seçim işlenirken hata:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Ses seçimi işlenirken bir hata oluştu!', ephemeral: true });
      } else {
        await interaction.followUp({ content: 'Ses seçimi işlenirken bir hata oluştu!', ephemeral: true });
      }
    }
  }
}); 