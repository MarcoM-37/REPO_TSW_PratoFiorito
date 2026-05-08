<script setup>
    const props = defineProps(['item' , 'listaAcquisti' , 'inProva'])
    const emits = defineEmits(['prova' , 'acquisto' , 'equipaggia'])
</script>

<template>
    <div :key="item.id" class="slot_oggetto">
        <div class="anteprima" :style="{ backgroundColor: item.asset_url }"></div>
        <span>{{ item.nome }}</span>

        <!-- Se non è acquistato: Mostra Prova e Acquista -->
        <div class="azioni-item" v-if="!listaAcquisti.includes(item.id_oggetto)">
            <!-- Il testo cambia se stiamo provando questo specifico id_oggetto -->
            <button class="btn-prova" @click="$emit('prova',item)"> {{ inProva.tema === item.id_oggetto ? '↩️ Ripristina' : '👁️ Prova' }} </button>
            <button class="btn-compra" @click="$emit('acquisto',item)"> 💰 {{ item.prezzo }} </button>
        </div>

        <!-- Se è già acquistato -->
        <div class="azioni-item" v-else>
            <button class="btn-prova" @click="$emit('equipaggia',item)">✨ Equipaggia</button>
            <span class="span_acquisto">Acquistato ✅</span>
        </div>
    </div>
</template>

<style scoped>
    @import './style_shop.css'
</style>