FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./


RUN tr -d '\r' < mvnw > mvnw_unix && mv mvnw_unix mvnw && chmod +x mvnw


RUN ./mvnw dependency:go-offline -B
COPY src ./src

RUN ./mvnw clean package -DskipTests
FROM eclipse-temurin:17-jre-alpine AS runner

WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/target/*.jar app.jar
RUN chown appuser:appgroup app.jar
USER appuser
EXPOSE 8085
ENTRYPOINT ["java", "-jar", "app.jar"]
