<script setup>
import { skin } from '../ambiente.js'

const props = defineProps(['item'])
const emits = defineEmits(['attiva'])
</script>

<template>
  <div :key="item.id" class="slot_oggetto">
    <div
      class="anteprima"
      :style="{
        backgroundImage: `url(${item.asset_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }"
      :class="{ selezionato: skin.sfondoURL.includes(item.asset_url) }"
      @click="$emit('attiva', item)"
    ></div>
    <span>{{ item.nome }}</span>
  </div>
</template>

<style scoped>
@import './style_slot.css';
</style>
