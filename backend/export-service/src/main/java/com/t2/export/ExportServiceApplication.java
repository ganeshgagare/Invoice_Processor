package com.t2.export;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
@SpringBootApplication @EnableDiscoveryClient
public class ExportServiceApplication { public static void main(String[] a) { SpringApplication.run(ExportServiceApplication.class,a); } }
