import { mount, shallowMount } from '@vue/test-utils'
import AlertMessage from "../src/modules/common/AlertMessage.vue"

test('Display default message', async () => {
	const wrapper = mount( AlertMessage, {
		props: {
      		alert: {text:'abcd'}
    	}	
	})
	
	expect(wrapper.classes()).toContain('alert-info')	
	expect(wrapper.text()).toContain('abcd')
})

test('Display danger message', async () => {
	const wrapper = mount( AlertMessage, {
		props: {
      		alert: {text:'abcd', type:'alert-danger'}
    	}
		
	} )
	
	expect(wrapper.classes()).toContain('alert-danger')		
})

test('Display empty message', async () => {
	const wrapper = mount( AlertMessage, {
		props: {
      		alert: {}
    	}
		
	} )
	
	expect(wrapper.classes()).toContain('alert-info')
})

test('Display null message', async () => {
	const wrapper = mount( AlertMessage, {
		props: {
      		alert: null
    	}
		
	} )
	
	expect(wrapper.classes()).toContain('alert-info')
})
