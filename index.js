const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  getVoiceConnection,
  NoSubscriberBehavior
} = require("@discordjs/voice");
const { join } = require("path");
const prism = require("prism-media");
require('dotenv').config();
prism.FFmpegPath = join(__dirname, "node_modules", "ffmpeg-static", "ffmpeg");
const express = require("express");
const app = express();
const port = 3000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
  ]
});

function retorna_embed() {
  const embed = new EmbedBuilder();
  return embed;
}

client.on("ready", () => {
  console.log("Shimonade está online 🍋!");
});

const play = require("play-dl");
const playQueue = {};

client.on("messageCreate", async (message) => {
  if (message.content.startsWith("-play") || message.content.startsWith("-next")) {
    const embedAuthor = retorna_embed();
    if(message.content.startsWith("-play") && message.content.length <= 6){
      embedAuthor.setDescription('**O comando deve ser feito da seguinte mandeira: \n\n\ ➡️  "-play (nome ou url)"**');
      message.channel.send({embeds:[embedAuthor]});
      return;
    }
    if (!message.member.voice.channel) {
      embedAuthor.setAuthor({ name: "Para iniciar uma sessão, você precisa estar conectado a um canal de voz!" }).setColor(0xd41549);
      return message.channel.send({ embeds: [embedAuthor] });
    }

    const voiceChannel = message.member?.voice.channel;
    const connection = joinVoiceChannel({ channelId: voiceChannel.id, guildId: message.guild.id, adapterCreator: message.guild.voiceAdapterCreator });
    let id_server = message.member.guild.id
    const playSong = async () => {
      if (Object.keys(playQueue[id_server]).length === 0) {
        const embed = retorna_embed();
        embed.setColor('ff0000');
        embed.setDescription('A fila de reprodução está vazia!')
        connection.disconnect();
        message.channel.send({ embeds: [embed] });
        return;
      }

      const currentSongUrl = Object.keys(playQueue[id_server])[0];
      const { title, duration, thumbnail, channel, user, picture } = playQueue[id_server][currentSongUrl];

      const stream = await play.stream(currentSongUrl);
      const resource = createAudioResource(stream.stream, { inputType: stream.type });
      player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play
        }
      });

      player.play(resource);
      const embed1 = retorna_embed();
      embed1.setColor(0x15e75e).setAuthor({ name: `Tocando agora:`, iconURL: "https://cdn-icons-png.flaticon.com/512/1384/1384060.png" }).setThumbnail(thumbnail).setTitle(`${title}`).setURL(`${currentSongUrl}`).setDescription(`Duração da música: **${duration}**`).addFields({ name: "Canal:", value: `${channel}` }).setFooter({ text: `Adicionado por ${user}`, iconURL: `${picture}` });
      message.channel.send({ embeds: [embed1] });

      connection.subscribe(player);
      await new Promise((resolve) => {
        const checkEnd = setInterval(() => {
          if (player.state.status === AudioPlayerStatus.Idle) {
            clearInterval(checkEnd);
            resolve();
          }
        }, 1000);
      });

      delete playQueue[id_server][currentSongUrl];
      playSong();
    };

    if (message.content.startsWith("-next")) {
      if (!message.member.voice.channel) {
        const embed3 = retorna_embed();
        embed3
          .setDescription('**Você precisa estar conectado em um canal de voz!**');
        message.channel.send({embeds: [embed3]});
        return
      }
      const currentSongUrl = Object.keys(playQueue[id_server])[0];
      delete playQueue[id_server][currentSongUrl];
      playSong();
    }

    if (message.content.startsWith("-play")) {
      let args = message.content.split(" ").slice(1).join(" ");

      if (args.split("&list=").length == 2) {
        const playlistUrl = message.content.split(" ")[1];
        const playlist = await play.playlist_info(playlistUrl);
        let tempo_playlist = 0
        playlist.videos.forEach((video) => {
          if (!playQueue[id_server]) {
            playQueue[id_server] = {}; // cria um novo objeto vazio se a propriedade não existir
          }
          tempo_playlist += video.durationInSec;
          if (!playQueue[id_server][video.url]) {
            // verifica se a propriedade do vídeo ainda não existe no objeto playQueue[id_server]
            playQueue[id_server][video.url] = {
              title: video.title,
              duration: video.durationRaw,
              thumbnail: video.thumbnails[3].url,
              channel: video.channel.name,
              user: message.member.user.username,
              picture: `https://cdn.discordapp.com/avatars/${message.member.user.id}/${message.member.user.avatar}.webp?size=80`
            };
          }
        });
        if (Object.keys(playQueue[id_server]).length !== 1) {
          function converterSegundos(segundos) {
            return new Date(segundos * 1000).toISOString().substr(11, 8);
          }
          console.log(playlist.videos.length)
          const embed = new EmbedBuilder().setColor(0x15e75e)
            .setAuthor({name: `Playlist adiciona na fila!`, iconURL: "https://cdn-icons-png.flaticon.com/512/1384/1384060.png"})
            .setTitle(`${playlist.title}`)
            .setThumbnail(`${playlist.videos[0].thumbnails[3].url}`)
            .setDescription(`**${playlist.videos.length}** músicas adicionadas \n Tempo estimado: **${converterSegundos(tempo_playlist)}** `)
            .setFooter({ text: `Adicionado por ${message.member.user.username}`, iconURL: `https://cdn.discordapp.com/avatars/${message.member.user.id}/${message.member.user.avatar}.webp?size=80` });
          
          message.channel.send({ embeds: [embed] });
          player = createAudioPlayer({
            behaviors: {
              noSubscriber: NoSubscriberBehavior.Play
            }
          });
            if(player.state.status !== 'buffering'){
              playSong();
            }
          } 
  
      } else {
        let isUrl = false;
        const urlRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = args.match(urlRegex);
        if (match) { // Se o argumento for uma URL do YouTube, extrai o ID do vídeo do link
          const videoId = match[1];
          args = videoId;
          isUrl = true;
        }

        let searchResult = await play.search(args, { limit: 1 });

        if (!searchResult || !searchResult[0]) {
          if (!isUrl) {
            return message.reply("Nenhum resultado encontrado para a sua pesquisa!");
          } else {
            searchResult = await play.stream(`https://www.youtube.com/watch?v=${query}`);
          }
        }

        const url = searchResult[0].url;
        const video = await play.video_info(url);
        video_infos = video.video_details;
        if (!playQueue[id_server]) {
          playQueue[id_server] = {}; // cria um novo objeto vazio se a propriedade não existir
        }
        if (!playQueue[id_server][url]) {
          playQueue[id_server][url] = {
            title: video_infos.title,
            duration: video_infos.durationRaw,
            thumbnail: video_infos.thumbnails[3].url,
            channel: video_infos.channel.name,
            user: message.member.user.username,
              picture: `https://cdn.discordapp.com/avatars/${message.member.user.id}/${message.member.user.avatar}.webp?size=80`
          };
        }
    
        if (Object.keys(playQueue[id_server]).length !== 1) {
          const embed = new EmbedBuilder()
            .setColor(0x15e75e)
            .setAuthor({
            name: `Música adicionada a fila: \n${playQueue[id_server][url].title
              }`, iconURL: "https://cdn-icons-png.flaticon.com/512/1384/1384060.png"
          })
          .setFooter({ text: `Adicionado por ${message.member.user.username}`, iconURL: `https://cdn.discordapp.com/avatars/${message.member.user.id}/${message.member.user.avatar}.webp?size=80` }).setDescription(`Duração música: **${video_infos.durationRaw}**`);
          message.channel.send({ embeds: [embed] });
        } else {
          playSong();
        }
      }
    }
  }
});

client.on("messageCreate", async (message) => {
  const embed = retorna_embed();
  let id_server = message.member.guild.id
  if(message.content.startsWith('-')){
    const rex = /-play|-pause|-queue|-resume|-stop|-shimonade|-help|-shuffle|-next/g;
    if(!rex.test(message.content)){
      embed
        .setDescription('**Esse comando não está dentro do nosso escopo. \nPor favor               verifique os comandos com o -help**')
        .setTitle("Shimonade 🍋🐕")
        .setThumbnail("https://i.imgur.com/WIOikdE.png")
      message.channel.send({embeds: [embed]})
    }
  }
  // ============= PAUSE E DESPAUSE SESSÃO ========================
  if (message.content === "-pause") {
    const connection = getVoiceConnection(message.guild.id);
    if (!connection) {
      return message.reply("Eu não estou em um canal de voz.");
    }
    const player = connection.state.subscription.player;
    if (player.state.status === AudioPlayerStatus.Playing) {
      player.pause();
      embed.setDescription("Música Pausada!");
      message.channel.send({ embeds: [embed] });
    } else if (player.state.status === AudioPlayerStatus.Paused) {
      embed.setDescription("A música já está pausada");
      message.channel.send({ embeds: [embed] });
    } else {
      message.reply("Nenhuma música está tocando.");
    }
  } else if (message.content === "-resume") {
    const connection = getVoiceConnection(message.guild.id);
    if (!connection) {
      return message.reply("Eu não estou em um canal de voz.");
    }
    const player = connection.state.subscription.player;
    if (player.state.status === AudioPlayerStatus.Paused) {
      player.unpause();
      embed.setDescription("Música Despausada");
      message.channel.send({ embeds: [embed] });
    } else if (player.state.status === AudioPlayerStatus.Playing) {
      message.reply("A música já está tocando!");
    } else {
      message.reply("Nenhuma música está tocando.");
    }
  }

  // ============= QUEUE SESSÃO ========================
  const itemsPerPage = 10; // número de itens por página

  if (message.content.startsWith("-queue")) {
    console.log(playQueue[id_server])
    try {
      if (playQueue[id_server].length === 0) return;

    } catch (err) {
      const embed = retorna_embed();
      embed.setColor('ff0000');
      embed.setDescription('A fila de reprodução está vazia!')
      message.channel.send({ embeds: [embed] });
      return;
    }
    if (Object.keys(playQueue[id_server]).length === 0) {
      const embed = retorna_embed();
      embed.setColor('ff0000');
      embed.setDescription('A fila de reprodução está vazia!')
      return message.channel.send({ embeds: [embed] });
    }
    const pages = [];
    let currentPage = [];

    // criar uma matriz com todas as músicas da fila
    Object.entries(playQueue[id_server]).forEach(([url, {
      title
    }]) => {
      currentPage.push(`${title}`);
      if (currentPage.length === itemsPerPage) {
        pages.push(currentPage);
        currentPage = [];
      }
    });

    // adicionar a última página, se houver menos de "itemsPerPage" itens
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    // exibir a primeira página da fila
    let pageIndex = 0;
    const embed = createQueueEmbed(pageIndex, pages);
    const messageEmbed = await message.channel.send({ embeds: [embed] });

    // adicionar botões de seta para permitir que o usuário avance ou retroceda nas páginas da fila
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("previous").setLabel("Previous").setStyle(ButtonStyle.Secondary).setDisabled(true), new ButtonBuilder().setCustomId("next").setLabel("Next").setStyle(ButtonStyle.Primary));

    const buttonFilter = (interaction) => interaction.customId === "previous" || interaction.customId === "next";
    const collector = messageEmbed.createMessageComponentCollector({ filter: buttonFilter });

    // atualizar o embed quando o usuário clicar em um botão de seta
    collector.on("collect", (interaction) => {
      if (interaction.customId === "previous") {
        pageIndex--;
      } else if (interaction.customId === "next") {
        pageIndex++;
        if (pageIndex >= pages.length) {
          pageIndex = pages.length - 1;
        }
      }

      const newEmbed = createQueueEmbed(pageIndex, pages);
      interaction.update({ embeds: [newEmbed] });

      // desativar o botão "previous" se o usuário estiver na primeira página da fila
      row.components[0].setDisabled(pageIndex === 0);

      // desativar o botão "next" se o usuário estiver na última página da fila
      row.components[1].setDisabled(pageIndex === pages.length - 1);

      interaction.message.edit({ embeds: [newEmbed], components: [row] });
    });

    // adicionar a linha de botões ao embed
    messageEmbed.edit({ embeds: [embed], components: [row] });
  }

  // função auxiliar para criar o embed de fila
  function createQueueEmbed(pageIndex, pages) {
    const embed = {
      color: 0x0099ff,
      title: "Queue",
      fields: []
    };

    const currentPage = pages[pageIndex];
    currentPage.forEach((title, index) => {
      embed.fields.push({
        name: `${pageIndex * itemsPerPage + index + 1
          }. ${title}`,
        value: "",
        inline: false
      });
    });

    return embed;
  }

  // ============= LIMAO SESSÃO ========================
  let lemon_teste = message.content.toLowerCase();
  const regex = /limão|limao|LIMÃO|Limao|Limão|LMAO|lmao/g;

  if (regex.test(lemon_teste)) {
    if (message.author.id == 369231549742448640) {
      return message.reply("É o meu lindo Criador 🍋.");
    } else {
      return message.react("🍋");
    }
  }

  if(message.content.startsWith('porra')){
    message.channel.send('Porra, caralho, cu, buceta, desgraça, pica, rola');
  }
  
  if(message.content == '-shuffle'){
    if(playQueue[id_server].lenght === 1 || playQueue[id_server].length === 0){
          embed.setDescription('É necesário 2 músicas ou mais para o embaralhamento!');
          message.channel.send({embeds: [embed]});
          return;
    }
    const entries = Object.entries(playQueue[id_server]);
    entries.shift(); // remove o primeiro elemento do array de pares chave-valor
    const shuffledEntries = entries.sort(() => Math.random() - 0.5); // embaralha o array de pares chave-valor

    playQueue[id_server] = Object.fromEntries(shuffledEntries)


    embed.setDescription('Músicas embaralhadas com sucesso!')
    message.channel.send({embeds: [embed]});
  }
  
  // ============= STOP SESSÃO ========================
  if (message.content === "-stop") { // Verifique se o membro que enviou a mensagem está em um canal de voz

    if (!message.member.voice.channel) {
      return message.channel.send("Você precisa estar conectado a um canal de voz para usar esse comando.");
    }


    for (const prop in playQueue[id_server]) {
      if (Object.hasOwnProperty.call(playQueue[id_server], prop)) {
        delete playQueue[id_server][prop];
      }
    }
    const voiceChannel = message.member?.voice.channel;
    const connection = joinVoiceChannel({ channelId: voiceChannel.id, guildId: message.guild.id, adapterCreator: message.guild.voiceAdapterCreator });
    connection.disconnect();


    const embed = retorna_embed();
    embed.setColor('ff0000');
    embed.setDescription('A fila de reprodução foi interrompida.')
    return message.channel.send({ embeds: [embed] });
  }

  // ============= HELP SESSÃO ========================
  if (message.content === "-help") {
    const embed2 = new EmbedBuilder().setThumbnail("https://i.imgur.com/WIOikdE.png").setTitle("Bem vindo ao Shimonade, aqui estão nossos comandos:").setDescription("\n\n**-play** \n↪️ Comando para tocar qualquer música do Youtube, aceita os seguintes parâmetros(url_individual, url_playlist, nome da musica) \n\n**-next** \n↪️Comando para passar para a próxima música\n\n**-pause** \n↪️ Comando para pausa a música \n\n**-resume** \n↪️ Comando para despausar a música\n\n**-queue** \n↪️ Comando para visualizar a fila de músicas\n\n**-shuffle** \n↪️ Comando para embaralhar as músicas \n\n**-stop** \n↪️ Comando para parar as músicas e kickar o bot \n\n**-help** \n↪️ Comando para verificar as músicas que estão na fila");
    message.channel.send({ embeds: [embed2] });
  }

  if (message.content === "-shimonade") {
    const embed2 = new EmbedBuilder().setTitle("Bem vindo ao Shimonade 🍋🐕").setThumbnail("https://i.imgur.com/WIOikdE.png").setDescription("O Bot ainda está em desenvolvimento e pode apresentar muitos bugs, por gentileza me informe sempre que presenciar um!").setFooter({ text: "By Lemonade & Shiber" });

    message.channel.send({ embeds: [embed2] });
  }

  
});

client.login(process.env['token']);


