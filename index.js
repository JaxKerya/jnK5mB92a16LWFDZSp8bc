const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, NoSubscriberBehavior, entersState } = require('@discordjs/voice');
const { join } = require('path');
const fs = require('fs');

// Bot token ve client ID

const tokenPart1 = 'MTM3MTUwNTE0MDg2NzAxMDYyMQ.GHHmUv';
const tokenPart2 = '.l2KFaf9yEKKKsQfOD-1vlNMb8gl7z4lTALd20o';

const TOKEN = tokenPart1 + tokenPart2; // Botunuzun token'ını buraya yerleştirin
const CLIENT_ID = '1371505140867010621'; // Botunuzun client ID'sini buraya yerleştirin

// Ses dosyası yolu
const AUDIO_FILE_PATH = join(__dirname, 'sounds', 'audio.mp3');

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
  
  // Ses dosyasının varlığını kontrol et
  if (!fs.existsSync(AUDIO_FILE_PATH)) {
    console.warn(`UYARI: ${AUDIO_FILE_PATH} ses dosyası bulunamadı. Lütfen 'sounds' klasörüne 'audio.mp3' adında bir ses dosyası ekleyin.`);
  }
});

// Hata yakalama
client.on('error', error => {
  console.error('Bot bir hata ile karşılaştı:', error);
});

// Bağlantı kapatıldığında
client.on('shardDisconnect', (event, id) => {
  console.log(`Bot #${id} bağlantısı kesildi:`, event);
});

// Slash komut işleyicisi
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'arın') {
    try {
      // Kullanıcının ses kanalında olup olmadığını kontrol et
      const member = interaction.member;
      
      if (!member.voice.channel) {
        return interaction.reply({ content: 'Bir ses kanalında olmalısınız!', ephemeral: true });
      }

      // Ses dosyasının varlığını kontrol et
      if (!fs.existsSync(AUDIO_FILE_PATH)) {
        return interaction.reply({ 
          content: 'Ses dosyası bulunamadı! Lütfen botun yöneticisine haber verin.', 
          ephemeral: true 
        });
      }

      // Kullanıcının bulunduğu ses kanalına katıl
      const voiceChannel = member.voice.channel;
      
      await interaction.reply({
        embeds: [{
          description: 'Arındırılıyor...',
          color: 0x5E0B15 // Mavi renk
        }]
      });
      
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
        return interaction.followUp('Ses kanalına bağlanırken bir hata oluştu. Yetkilere sahip olduğumdan emin olun.');
      }
      
      // Bağlantı hata işleme
      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          console.log('Bağlantı kesildi, bağlantı kapatılıyor...');
          // Bağlantıyı yeniden kurmaya çalışmak yerine direkt olarak kapatıyoruz
          connection.destroy();
        } catch (error) {
          console.error('Bağlantıyı kapatırken hata:', error);
          // Hata durumunda da bağlantıyı kapatmaya çalış
          connection.destroy();
        }
      });
      
      connection.on(VoiceConnectionStatus.Destroyed, () => {
        console.log('Bağlantı tamamen kapatıldı.');
      });
      
      connection.on('error', error => {
        console.error('Ses bağlantı hatası:', error);
        interaction.followUp('Ses bağlantısında bir hata oluştu!').catch(console.error);
        connection.destroy();
      });
        
      // Ses dosyasını oynat
      try {
        const player = createAudioPlayer({
          behaviors: {
            noSubscriber: NoSubscriberBehavior.Pause,
          },
        });
        
        const resource = createAudioResource(AUDIO_FILE_PATH);
        
        player.on('error', error => {
          console.error('Ses oynatma hatası:', error);
          interaction.followUp('Ses dosyasını oynatırken bir hata oluştu!').catch(console.error);
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
          console.log('Ses dosyası oynatılıyor...');
        });
        
        // Bağlantı kurulduğunda
        connection.on(VoiceConnectionStatus.Ready, () => {
          console.log('Ses kanalına başarıyla bağlandı!');
          connection.subscribe(player);
          player.play(resource);
        });
        
      } catch (playError) {
        console.error('Ses oynatıcısı oluşturulurken hata:', playError);
        interaction.followUp('Ses dosyasını oynatırken bir hata oluştu!').catch(console.error);
        connection.destroy();
      }
      
    } catch (error) {
      console.error('Genel hata:', error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'Bir hata oluştu!', ephemeral: true }).catch(console.error);
      } else {
        await interaction.reply({ content: 'Bir hata oluştu!', ephemeral: true }).catch(console.error);
      }
    }
  }
}); 