<script setup lang="ts">
defineProps<{
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  title: string;
  description: string;
}>();

const emit = defineEmits<{
  next: [];
  previous: [];
  skip: [];
}>();
</script>

<template>
  <transition name="walkthrough-fade">
    <div v-if="isActive" class="walkthrough-overlay">
      <div class="walkthrough-card">
        <!-- Progress dots -->
        <div class="walkthrough-dots">
          <span
            v-for="i in totalSteps"
            :key="i"
            class="walkthrough-dot"
            :class="{ active: i - 1 === currentStep, completed: i - 1 < currentStep }"
          />
        </div>

        <!-- Step content -->
        <div class="walkthrough-content">
          <h3 class="walkthrough-title">{{ title }}</h3>
          <p class="walkthrough-desc">{{ description }}</p>
        </div>

        <!-- Navigation -->
        <div class="walkthrough-nav">
          <button
            class="walkthrough-btn walkthrough-btn-skip"
            @click="emit('skip')"
          >
            Skip
          </button>
          <div class="walkthrough-nav-right">
            <span class="walkthrough-counter">{{ currentStep + 1 }} / {{ totalSteps }}</span>
            <button
              v-if="currentStep > 0"
              class="walkthrough-btn walkthrough-btn-back"
              @click="emit('previous')"
            >
              Back
            </button>
            <button
              class="walkthrough-btn walkthrough-btn-next"
              @click="emit('next')"
            >
              {{ currentStep === totalSteps - 1 ? 'Done' : 'Next' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.walkthrough-overlay {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  pointer-events: auto;
}

.walkthrough-card {
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(99, 102, 241, 0.4);
  border-radius: 12px;
  padding: 16px 20px;
  backdrop-filter: blur(12px);
  min-width: 340px;
  max-width: 480px;
}

.walkthrough-dots {
  display: flex;
  gap: 6px;
  justify-content: center;
  margin-bottom: 12px;
}

.walkthrough-dot {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: #334155;
  transition: all 0.3s ease;
}

.walkthrough-dot.active {
  width: 24px;
  background: #6366f1;
}

.walkthrough-dot.completed {
  background: #6366f1;
  opacity: 0.5;
}

.walkthrough-content {
  margin-bottom: 14px;
}

.walkthrough-title {
  margin: 0 0 4px 0;
  font-size: 15px;
  font-weight: 600;
  color: #f1f5f9;
}

.walkthrough-desc {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.5;
}

.walkthrough-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.walkthrough-nav-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.walkthrough-counter {
  font-size: 11px;
  color: #64748b;
  font-family: 'Fira Code', monospace;
}

.walkthrough-btn {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
}

.walkthrough-btn-skip {
  background: transparent;
  color: #64748b;
}

.walkthrough-btn-skip:hover {
  color: #94a3b8;
}

.walkthrough-btn-back {
  background: rgba(51, 65, 85, 0.5);
  color: #94a3b8;
}

.walkthrough-btn-back:hover {
  background: rgba(51, 65, 85, 0.8);
}

.walkthrough-btn-next {
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.4);
}

.walkthrough-btn-next:hover {
  background: rgba(99, 102, 241, 0.35);
}

/* Transition */
.walkthrough-fade-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.walkthrough-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.walkthrough-fade-enter-from,
.walkthrough-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}
</style>
