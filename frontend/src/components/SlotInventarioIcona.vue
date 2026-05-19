<script setup>
import { skin } from '../ambiente.js'

const props = defineProps(['item'])
const emits = defineEmits(['attiva'])
</script>

<template>
  <div :key="item.id" class="slot_oggetto">
    <div
      class="anteprima anteprima_icone"
      :class="{ selezionato: skin.icona === item.asset_url }"
      @click="$emit('attiva', item)"
    >
      {{ item.asset_url }}
    </div>
    <span>{{ item.nome }}</span>
  </div>
</template>

<style scoped>
@import './style_slot.css';

.anteprima_icone {
  font-size: 200%;
  background-color: #f0f0f0;
  user-select: none;
}
</style>
