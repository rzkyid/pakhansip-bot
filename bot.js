require('dotenv').config();
const { 
    Client, GatewayIntentBits, ActivityType, SlashCommandBuilder, PermissionFlagsBits 
    } = require('discord.js');
const { 
    joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus 
    } = require('@discordjs/voice');

const express = require('express');
const path = require('path');

// Token Bot Discord
const TOKEN = process.env.TOKEN;

// Konfigurasi Bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
    ],
});

const PREFIX = 'hs';
const LOG_CHANNEL_ID = '1099916187044941914';

// Konfigurasi Express untuk menangani port
const app = express();
const PORT = process.env.PORT || 3000;

// Routing dasar untuk memastikan aplikasi web berjalan
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'index.html');
    res.sendFile(filePath);
});

app.listen(PORT, () => {
    console.log('\x1b[36m[ SERVER ]\x1b[0m', `\x1b[32mSH : http://localhost:${PORT} ✅\x1b[0m`);
});

/*/*
// Register Slash Commands
client.on('ready', () => {
        client.application.commands.create(
        new SlashCommandBuilder()
        .setName('say')
        .setDescription('Bot akan mengirimkan pesan yang kamu ketik.')
        .addStringOption((option) =>
            option
                .setName('pesan')
                .setDescription('Ketik pesan yang akan dikirim oleh bot')
                .setRequired(true)
        )
    );
});

// Fitur mengirim pesan melalui bot
client.on('interactionCreate', async (interaction) => {
    // Pastikan hanya menangani Slash Command
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    // Periksa apakah user memiliki role dengan ID '1077457424736333844' atau admin
    const hasPermission = interaction.memberPermissions.has(PermissionFlagsBits.Administrator) ||
        interaction.member.roles.cache.has('1077457424736333844'); // Cek apakah pengguna memiliki role dengan ID ini

    if (!hasPermission) {
        return interaction.reply({ content: "Anda tidak memiliki izin untuk menggunakan perintah ini.", ephemeral: true });
    }
    
// Fitur /say untuk mengirim pesan melalui Bot
    if (interaction.commandName === 'say') {
        // Mendapatkan pesan dari opsi
        const pesan = interaction.options.getString('pesan');

        // Mengirimkan pesan
        await interaction.reply({ content: 'Pesan berhasil dikirim!', ephemeral: true });
        await interaction.channel.send(pesan); // Pesan dikirim ke channel tempat command digunakan
    }  
});
*/

// Auto delete message Bot Tatsu
const EXCLUDED_CHANNEL_ID = '1343774861218156665';
const TARGET_BOT_ID = '172002275412279296'; // User ID Tatsu

client.on('messageCreate', async (message) => {
    // Pastikan pesan berasal dari bot dengan ID Tatsu dan bukan di channel yang dikecualikan
    if (message.author.id === TARGET_BOT_ID && message.channel.id !== EXCLUDED_CHANNEL_ID) {
        setTimeout(async () => {
            try {
                await message.delete();
                console.log(`Pesan dari Tatsu dihapus di #${message.channel.name}`);

                // Kirim log ke channel log
                const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
                if (logChannel) {
                    logChannel.send(`🗑️ Pesan dari **Tatsu** dihapus di <#${message.channel.id}>.`);
                }
            } catch (error) {
                console.error(`Gagal menghapus pesan dari Tatsu: ${error.message}`);
            }
        }, 10000); // 10 detik
    }
});

// Untuk menyimpan status player
let player;
let connection;

// Fungsi untuk memutar audio di voice channel
async function playAudio(channel) {
    try {
        const audioPath = path.join(__dirname, 'audio', 'sirine2.mp3');
        connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        player = createAudioPlayer();
        connection.subscribe(player);

        const playResource = () => {
            const resource = createAudioResource(audioPath, {
                inlineVolume: true,
            });
            resource.volume.setVolume(0.08); // Atur volume ke 8%
            player.play(resource);
        };

        playResource();

        player.on(AudioPlayerStatus.Idle, () => {
            console.log('Audio selesai, memulai ulang...');
            playResource();
        });

        player.on('error', (error) => {
            console.error('Kesalahan pada audio player:', error);
        });

        connection.on('error', (error) => {
            console.error('Kesalahan pada koneksi voice channel:', error);
        });

        console.log('Audio sedang diputar di voice channel.');
    } catch (error) {
        console.error('Gagal memutar audio:', error);
    }
}

// Event Message Create
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel && message.content.startsWith(PREFIX)) {
        logChannel.send(`[LOG] ${message.author.tag} menggunakan perintah: ${message.content}`);
    }

    // Perintah untuk bergabung ke voice channel dan memutar audio
    if (message.content.startsWith(`${PREFIX}join`)) {
        const voiceChannel = message.member.voice.channel;

        if (!voiceChannel) {
            message.reply('Anda harus berada di voice channel untuk menggunakan perintah ini.');
            return;
        }

        await playAudio(voiceChannel);
        message.reply('Pak Hansip telah bergabung ke channel.');
    }

    // Perintah untuk keluar dari voice channel
    if (message.content.startsWith(`${PREFIX}leave`)) {
        if (connection) {
            connection.destroy();
            connection = null;
            player = null;
            message.reply('Pak Hansip telah keluar dari voice channel.');
        } else {
            message.reply('Pak Hansip tidak berada di voice channel.');
        }
    }
});

// Status Bot
const statusMessages = ["⚠️ Mohon Perhatian", "👥 Bagi Seluruh Warga", "📝 Baca Peraturan Desa!"];
const statusTypes = ['idle'];
let currentStatusIndex = 0;
let currentTypeIndex = 0;

// Update Status Bot
function updateStatus() {
    const currentStatus = statusMessages[currentStatusIndex];
    const currentType = statusTypes[currentTypeIndex];
    client.user.setPresence({
        activities: [{ name: currentStatus, type: ActivityType.Custom }],
        status: currentType,
    });
    console.log('\x1b[33m[ STATUS ]\x1b[0m', `Updated status to: ${currentStatus} (${currentType})`);
    currentStatusIndex = (currentStatusIndex + 1) % statusMessages.length;
    currentTypeIndex = (currentTypeIndex + 1) % statusTypes.length;
}

// Heartbeat untuk memeriksa aktivitas bot
function heartbeat() {
    setInterval(() => {
        console.log('\x1b[35m[ HEARTBEAT ]\x1b[0m', `Bot is alive at ${new Date().toLocaleTimeString()}`);
    }, 30000);
}

// Event Ready
client.once('ready', () => {
    console.log('\x1b[36m[ INFO ]\x1b[0m', `Ping: ${client.ws.ping} ms`);
    updateStatus();
    setInterval(updateStatus, 10000);
    heartbeat();
});

// Login ke Bot
async function login() {
    try {
        await client.login(TOKEN);
        console.log('\x1b[36m[ LOGIN ]\x1b[0m', `\x1b[32mLogged in as: ${client.user.tag} ✅\x1b[0m`);
        console.log('\x1b[36m[ INFO ]\x1b[0m', `\x1b[35mBot ID: ${client.user.id} \x1b[0m`);
    } catch (error) {
        console.error('\x1b[31m[ ERROR ]\x1b[0m', 'Failed to log in:', error);
        process.exit(1);
    }
}

// Jalankan bot
login();
