require('dotenv').config();
const { 
    Client, GatewayIntentBits, ActivityType, SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, EmbedBuilder, Collection 
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
        GatewayIntentBits.GuildMembers,
    ],
});

const PREFIX = 'hs';
const LOG_CHANNEL_ID = '1099916187044941914';
const CHANNEL_HUKUMAN_ID = '1286643676122185759';

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
                    logChannel.send(`[LOG] 🗑️ Pesan dari **Tatsu** dihapus di <#${message.channel.id}>.`);
                }
            } catch (error) {
                console.error(`Gagal menghapus pesan dari Tatsu: ${error.message}`);
            }
        }, 3000); // 3 detik
    }
});

//Auto timeout mention spam
const TIMEOUT_DURATION = 60 * 60 * 1000; // 1 jam dalam milidetik
const SPAM_LIMIT = 3; // Jumlah mention sebelum dianggap spam
const TIME_WINDOW = 5 * 60 * 1000; // 5 menit dalam milidetik

// Penyimpanan sementara untuk melacak mention role per user
const mentionTracker = new Collection();

client.on('messageCreate', async (message) => {
    // Pastikan pesan bukan dari bot untuk mencegah loop
    if (message.author.bot) return;

    // Cek apakah pesan mengandung mention role
    if (message.mentions.roles.size > 0) {
        const userId = message.author.id;
        const now = Date.now();

        // Jika user belum ada di tracker, buat entri baru
        if (!mentionTracker.has(userId)) {
            mentionTracker.set(userId, []);
        }

        // Tambahkan timestamp pesan ke dalam tracker user
        const timestamps = mentionTracker.get(userId);
        timestamps.push(now);

        // Hapus mention yang sudah lebih dari TIME_WINDOW (5 menit)
        mentionTracker.set(userId, timestamps.filter(ts => now - ts < TIME_WINDOW));

        // Jika jumlah mention dalam 5 menit melebihi batas, timeout user
        if (mentionTracker.get(userId).length >= SPAM_LIMIT) {
            try {
                // Ambil member dari guild
                const member = await message.guild.members.fetch(userId);

                // Berikan timeout (mute sementara)
                await member.timeout(TIMEOUT_DURATION, "Spam mention role");

                // Buat embed DM peringatan
                const dmEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('🚫 Dilarang SPAM Mention Role!')
                    .setDescription('Anda telah diberikan timeout selama **1 jam** karena melakukan spam mention role sebanyak **3x dalam 5 menit terakhir**.\n\nSilahkan baca <#1052123681578557500>')
                    .setFooter({ text: 'Gang Desa Moderation' })
                    .setTimestamp();

                // Kirim DM ke user
                await member.send({ embeds: [dmEmbed] }).catch(() => {
                    console.log(`Gagal mengirim DM ke ${member.user.tag}`);
                });

                // Kirim log ke channel log
                const logChannel = await client.channels.fetch(CHANNEL_HUKUMAN_ID).catch(() => null);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor('#FF0000') // Warna merah
                        .setTitle("🚫 SPAM Mention Role")
                        .setDescription(`**${member.user.tag}** telah diberikan timeout selama 1 jam karena spam mention role di <#${message.channel.id}>.`)
                        .setFooter({ text: 'Gang Desa Auto Moderation' })
                        .setTimestamp();
                
                    logChannel.send({ embeds: [embed] }).catch(err => console.error("Gagal mengirim log ke channel:", err));
                } else {
                    console.error(`Gagal menemukan channel log dengan ID: ${CHANNEL_HUKUMAN_ID}`);
                }

                // Hapus data dari tracker setelah timeout diberikan
                mentionTracker.delete(userId);
            } catch (error) {
                console.error(`Gagal memberikan timeout: ${error.message}`);
            }
        }
    }
});

// Auto delete mention everyone (kecuali role tertentu)
client.on('messageCreate', async (message) => {
    try {
        // Ambil informasi member
        const member = await message.guild.members.fetch(message.author.id);

        // Cek apakah user memiliki role yang diperbolehkan
        const ALLOWED_ROLE_ID = '1358092061798039809';
        if (member.roles.cache.has(ALLOWED_ROLE_ID)) {
            return; // Jika user memiliki role ini, biarkan mention @everyone
        }

        // Cek apakah pesan mengandung mention everyone
        if (message.mentions.everyone) {
            await message.delete();
            console.log(`Pesan mention everyone dihapus di #${message.channel.name}`);

            // Kirim log ke channel log
            const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) {
                logChannel.send(`[LOG] 🚨 **${message.author.tag}** mencoba mention everyone di <#${message.channel.id}>, pesannya telah dihapus.`);
            }
        }
    } catch (error) {
        console.error(`Gagal menghapus mention everyone: ${error.message}`);
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
    try {
        const vcid = "1307965818654560368";
        if (!client.channels.cache.get(vcid)) {
            console.error(`Channel dengan ID "${vcid}"" tidak ditemukan.`);
        } else {
            client.channels.fetch(vcid).then((channel) => {
                const connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                });

                console.log(
                    `Bot ${client.user.tag} sudah join ke channel ${channel.name}!`,
                );
            });
        }
    } catch (error) {
        console.error("Terjadi masalah saat mencoba gabung channel");
    }
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

login();
