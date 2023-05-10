package com.senac.MusicShare;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@ComponentScan
@EnableJpaRepositories
@SpringBootApplication
public class MusicShareApplication {

	public static void main(String[] args) {
		SpringApplication.run(MusicShareApplication.class, args);
	}

}
